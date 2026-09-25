/**
 * Block editor: Site Header variation, inspector controls, save filters.
 *
 * @package block-header-behavior
 */
( function ( wp ) {
	'use strict';

	if (
		! wp ||
		! wp.hooks ||
		! wp.compose ||
		! wp.blockEditor ||
		! wp.components ||
		! wp.element ||
		! wp.data
	) {
		return;
	}

	const { addFilter } = wp.hooks;
	const { createHigherOrderComponent } = wp.compose;
	const {
		InspectorControls,
		__experimentalColorGradientSettingsDropdown: ColorGradientSettingsDropdown,
		__experimentalUseMultipleOriginColorsAndGradients: useMultipleOriginColorsAndGradients,
	} = wp.blockEditor;

	const bhbHasNativeColorDropdown =
		typeof ColorGradientSettingsDropdown === 'function' &&
		typeof useMultipleOriginColorsAndGradients === 'function';
	const {
		Button,
		PanelBody,
		SelectControl,
		TextControl,
		Dropdown,
		__experimentalToolsPanelItem: ToolsPanelItem,
		__experimentalDropdownContentWrapper: DropdownContentWrapper,
		__experimentalHStack: HStack,
		__experimentalVStack: VStack,
		__experimentalHeading: ExperimentalHeading,
		FlexItem,
		Tooltip,
	} = wp.components;
	const { Fragment, createElement: el, useMemo, useCallback, useRef } = wp.element;
	const { useSelect } = wp.data;
	const { __ } = wp.i18n;

	const BLOCK_NAME = 'core/group';
	const HEADER_CLASS = 'site-header';

	/** Mesmo path do ícone de sombra do core (block-editor/global-styles). */
	var BHB_SHADOW_ICON_PATH =
		'M12 8c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm0 6.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zM12.8 3h-1.5v3h1.5V3zm-1.6 18h1.5v-3h-1.5v3zm6.8-9.8v1.5h3v-1.5h-3zm-12 0H3v1.5h3v-1.5zm9.7 5.6 2.1 2.1 1.1-1.1-2.1-2.1-1.1 1.1zM8.3 7.2 6.2 5.1 5.1 6.2l2.1 2.1 1.1-1.1zM5.1 17.8l1.1 1.1 2.1-2.1-1.1-1.1-2.1 2.1zM18.9 6.2l-1.1-1.1-2.1 2.1 1.1 1.1 2.1-2.1z';

	/**
	 * Matches Site Header variation semantics (tag + class list).
	 *
	 * @param {Object|undefined} attributes Block attributes.
	 * @return {boolean}
	 */
	function isSiteHeaderAttributes( attributes ) {
		const tag = ( attributes && attributes.tagName ) || 'div';
		const cls = ( attributes && attributes.className ) || '';
		if ( tag !== 'header' ) {
			return false;
		}
		return (
			cls
				.split( /\s+/ )
				.filter( Boolean )
				.indexOf( HEADER_CLASS ) !== -1
		);
	}

	/**
	 * Re-registers the Site Header variation with isActive() so the editor marks it
	 * as selected in "Transformar variação" (PHP cannot ship a function isActive).
	 *
	 * @return {void}
	 */
	function registerSiteHeaderVariation() {
		if ( ! wp.blocks || ! wp.blocks.registerBlockVariation ) {
			return;
		}

		const { unregisterBlockVariation, registerBlockVariation } = wp.blocks;

		if ( unregisterBlockVariation ) {
			unregisterBlockVariation( BLOCK_NAME, 'site-header' );
		}

		registerBlockVariation( BLOCK_NAME, {
			name: 'site-header',
			title: __( 'Site Header', 'block-header-behavior' ),
			description: __(
				'Semantic header group with optional sticky or overlay behavior.',
				'block-header-behavior'
			),
			attributes: {
				tagName: 'header',
				className: 'site-header',
				headerMode: 'default',
				headerScrolledBackground: '',
				headerScrolledShadow: '',
			},
			scope: [ 'inserter', 'transform' ],
			keywords: [
				__( 'header', 'block-header-behavior' ),
				__( 'navigation', 'block-header-behavior' ),
				__( 'banner', 'block-header-behavior' ),
			],
			isActive: function ( blockAttributes ) {
				return isSiteHeaderAttributes( blockAttributes );
			},
		} );
	}

	/**
	 * Elements last hidden by inspector masking (cleared each sync).
	 *
	 * @type {HTMLElement[]}
	 */
	let bhbMaskedElements = [];

	function bhbClearInspectorMasks() {
		bhbMaskedElements.forEach( function ( el ) {
			el.style.removeProperty( 'display' );
			el.removeAttribute( 'data-bhb-masked' );
		} );
		bhbMaskedElements = [];
	}

	function bhbMaskElement( el ) {
		if ( ! el || bhbMaskedElements.indexOf( el ) !== -1 ) {
			return;
		}
		el.setAttribute( 'data-bhb-masked', '1' );
		el.style.setProperty( 'display', 'none', 'important' );
		bhbMaskedElements.push( el );
	}

	/**
	 * Titles for the Layout panel (PHP localize + editor i18n can differ).
	 *
	 * @param {Record<string,string>} panelTitles
	 * @return {string[]}
	 */
	function bhbGetLayoutPanelTitleMatchers( panelTitles ) {
		const out = [];
		const fromPhp = panelTitles && panelTitles.layout ? String( panelTitles.layout ).trim() : '';
		if ( fromPhp ) {
			out.push( fromPhp );
		}
		if ( wp.i18n && typeof wp.i18n.__ === 'function' ) {
			const fromEditor = wp.i18n.__( 'Layout', 'default' ).trim();
			if ( fromEditor && out.indexOf( fromEditor ) === -1 ) {
				out.push( fromEditor );
			}
		}
		return out;
	}

	function bhbSyncInspectorPanels() {
		bhbClearInspectorMasks();

		const cfg =
			typeof window !== 'undefined' && window.bhbBlockHeaderBehavior && window.bhbBlockHeaderBehavior.inspector
				? window.bhbBlockHeaderBehavior.inspector
				: null;
		const hidden = cfg && Array.isArray( cfg.hiddenPanels ) ? cfg.hiddenPanels : [];
		if ( ! hidden.length ) {
			return;
		}

		if ( ! wp.data || ! wp.data.select ) {
			return;
		}

		const select = wp.data.select( 'core/block-editor' );
		if ( ! select || ! select.getSelectedBlockClientId ) {
			return;
		}

		const clientId = select.getSelectedBlockClientId();
		if ( ! clientId || ! select.getBlockName || ! select.getBlockAttributes ) {
			return;
		}

		if ( select.getBlockName( clientId ) !== BLOCK_NAME ) {
			return;
		}

		if ( ! isSiteHeaderAttributes( select.getBlockAttributes( clientId ) ) ) {
			return;
		}

		const inspector = document.querySelector( '.block-editor-block-inspector' );
		if ( ! inspector ) {
			return;
		}

		const titles = cfg.panelTitles || {};
		const layoutMatchers = bhbGetLayoutPanelTitleMatchers( titles );
		const layoutMatchSet = {};
		layoutMatchers.forEach( function ( t ) {
			layoutMatchSet[ t ] = true;
		} );

		if ( hidden.indexOf( 'layout' ) !== -1 && layoutMatchers.length ) {
			const headingSelectors = '.components-panel__body-title, .components-panel__body-toggle';
			inspector.querySelectorAll( headingSelectors ).forEach( function ( node ) {
				const label = node.textContent.trim();
				if ( ! layoutMatchSet[ label ] ) {
					return;
				}
				const panel = node.closest( '.components-panel__body' );
				if ( panel && inspector.contains( panel ) ) {
					bhbMaskElement( panel );
				}
			} );
		}

		if ( hidden.indexOf( 'position' ) !== -1 ) {
			inspector.querySelectorAll( '.block-editor-block-inspector__position' ).forEach( function ( el ) {
				bhbMaskElement( el );
			} );
		}
	}

	function bhbSetupInspectorPanelMasking() {
		if ( ! wp.data || ! wp.data.subscribe || ! wp.compose || ! wp.compose.debounce ) {
			return;
		}
		const run = wp.compose.debounce( bhbSyncInspectorPanels, 100 );
		wp.data.subscribe( run );
		run();

		let mo = null;
		let moRoot = null;

		function bhbBindComplementaryObserver() {
			const root = document.querySelector( '.interface-complementary-area' );
			if ( ! root || root === moRoot ) {
				return;
			}
			if ( mo ) {
				mo.disconnect();
				mo = null;
			}
			moRoot = root;
			mo = new MutationObserver( function () {
				run();
			} );
			mo.observe( root, { childList: true, subtree: true } );
		}

		const bindDebounced = wp.compose.debounce( bhbBindComplementaryObserver, 150 );
		wp.data.subscribe( bindDebounced );
		bindDebounced();
		if ( wp.domReady ) {
			wp.domReady( function () {
				bhbBindComplementaryObserver();
				run();
			} );
		}
	}

	function bhbOnEditorDomReady() {
		registerSiteHeaderVariation();
		bhbSetupInspectorPanelMasking();
	}

	if ( wp.domReady ) {
		wp.domReady( bhbOnEditorDomReady );
	} else {
		bhbOnEditorDomReady();
	}

	const KNOWN_LABELS = {
		default: __( 'Default', 'block-header-behavior' ),
		sticky: __( 'Sticky', 'block-header-behavior' ),
		overlay: __( 'Overlay', 'block-header-behavior' ),
	};

	/**
	 * Allowed mode slugs from PHP (filterable).
	 *
	 * @return {string[]}
	 */
	function getAllowedModes() {
		if (
			typeof window !== 'undefined' &&
			window.bhbBlockHeaderBehavior &&
			Array.isArray( window.bhbBlockHeaderBehavior.allowedModes )
		) {
			return window.bhbBlockHeaderBehavior.allowedModes.map( function ( m ) {
				return String( m );
			} );
		}
		return [ 'default', 'sticky', 'overlay' ];
	}

	/**
	 * Options for the mode select.
	 *
	 * @return {{label: string, value: string}[]}
	 */
	function getModeOptions() {
		return getAllowedModes().map( function ( slug ) {
			return {
				label: KNOWN_LABELS[ slug ] || slug,
				value: slug,
			};
		} );
	}

	/**
	 * Whether the block is a site header group.
	 *
	 * @param {Object} props Block props.
	 * @return {boolean}
	 */
	function isSiteHeaderGroup( props ) {
		return props.name === BLOCK_NAME && isSiteHeaderAttributes( props.attributes );
	}

	/**
	 * Sanitizes header mode against known values.
	 *
	 * @param {string} mode Raw mode.
	 * @return {string}
	 */
	function sanitizeMode( mode ) {
		const allowed = getAllowedModes();
		return allowed.indexOf( mode ) !== -1 ? mode : 'default';
	}

	/**
	 * @param {string} raw
	 * @return {string}
	 */
	function sanitizeScrolledBackgroundForOutput( raw ) {
		if ( ! raw || typeof raw !== 'string' ) {
			return '';
		}
		const t = raw.trim();
		if ( ! t || t.length > 800 ) {
			return '';
		}
		if ( /[<>"{}]|expression|javascript\s*:|@import/i.test( t ) ) {
			return '';
		}
		return t;
	}

	/**
	 * @param {string} raw
	 * @return {string}
	 */
	function sanitizeScrolledShadowForOutput( raw ) {
		if ( ! raw || typeof raw !== 'string' ) {
			return '';
		}
		const t = raw.trim();
		if ( ! t || t.length > 800 ) {
			return '';
		}
		if ( /[<>"{};]|expression|javascript\s*:|@import/i.test( t ) ) {
			return '';
		}
		return t;
	}

	/**
	 * @param {Array<{colors?: {slug:string,color:string}[]}>|undefined} colorGroups
	 * @return {{slug:string,color:string}[]}
	 */
	function bhbFlattenColors( colorGroups ) {
		const list = [];
		( colorGroups || [] ).forEach( function ( g ) {
			( g.colors || [] ).forEach( function ( c ) {
				list.push( c );
			} );
		} );
		return list;
	}

	/**
	 * @param {string} colorValue
	 * @param {{slug:string,color:string}[]} flatColors
	 * @return {string}
	 */
	function bhbEncodeColorAttr( colorValue, flatColors ) {
		if ( ! colorValue ) {
			return '';
		}
		const found = flatColors.find( function ( c ) {
			return c.color === colorValue;
		} );
		return found ? 'var:preset|color|' + found.slug : colorValue;
	}

	/**
	 * @param {string} raw
	 * @param {{slug:string,color:string}[]} flatColors
	 * @return {string|undefined}
	 */
	function bhbDecodeColorForPicker( raw, flatColors ) {
		if ( ! raw || typeof raw !== 'string' ) {
			return undefined;
		}
		const t = raw.trim();
		const m = /^var:preset\|color\|(.+)$/.exec( t );
		if ( ! m ) {
			return t || undefined;
		}
		const slug = m[ 1 ];
		const c = flatColors.find( function ( x ) {
			return x.slug === slug;
		} );
		return c ? c.color : undefined;
	}

	/**
	 * @param {string} raw
	 * @return {string}
	 */
	function bhbResolveBackgroundForCssVar( raw ) {
		const t = String( raw || '' ).trim();
		if ( ! t ) {
			return '';
		}
		let m = /^var:preset\|color\|(.+)$/.exec( t );
		if ( m ) {
			const v = 'var(--wp--preset--color--' + m[ 1 ] + ')';
			return sanitizeScrolledBackgroundForOutput( v );
		}
		m = /^var:preset\|gradient\|(.+)$/.exec( t );
		if ( m ) {
			const v = 'var(--wp--preset--gradient--' + m[ 1 ] + ')';
			return sanitizeScrolledBackgroundForOutput( v );
		}
		return sanitizeScrolledBackgroundForOutput( t );
	}

	/**
	 * Sombras padrão do plugin quando o tema não expõe presets em theme.json
	 * (o mesmo painel visual do core, sem depender de var(--wp--preset--shadow--)).
	 *
	 * @return {{name:string,slug:string,shadow:string}[]}
	 */
	function bhbBuiltinShadowPresets() {
		return [
			{
				name: __( 'Linha fina', 'block-header-behavior' ),
				slug: 'bhb-hairline',
				shadow: '0 1px 0 rgba(0, 0, 0, 0.06)',
			},
			{
				name: __( 'Pequena', 'block-header-behavior' ),
				slug: 'bhb-sm',
				shadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
			},
			{
				name: __( 'Média', 'block-header-behavior' ),
				slug: 'bhb-md',
				shadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
			},
			{
				name: __( 'Grande', 'block-header-behavior' ),
				slug: 'bhb-lg',
				shadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
			},
		];
	}

	/**
	 * @param {Object|undefined} settings Block editor settings.
	 * @return {{name:string,slug:string,shadow:string}[]}
	 */
	function bhbGetShadowPresetsFromSettings( settings ) {
		const unsetShadow = {
			name: __( 'Unset', 'default' ),
			slug: 'unset',
			shadow: 'none',
		};
		let list = [];
		if ( settings && settings.shadow ) {
			const defaultPresetsEnabled = !! settings.shadow.defaultPresets;
			const presets = settings.shadow.presets || {};
			const defaultShadows = presets.default || [];
			const themeShadows = presets.theme || [];
			const customShadows = presets.custom || [];
			list = []
				.concat( defaultPresetsEnabled ? defaultShadows : [] )
				.concat( themeShadows || [] )
				.concat( customShadows || [] );
		}
		if ( list.length ) {
			list.unshift( unsetShadow );
			return list;
		}
		return [ unsetShadow ].concat( bhbBuiltinShadowPresets() );
	}

	/**
	 * @param {string|undefined} cssShadow
	 * @param {{slug:string,shadow:string}[]} presetList
	 * @return {string}
	 */
	function bhbEncodeShadowFromPickerSelection( cssShadow, presetList ) {
		if ( cssShadow === undefined || cssShadow === null || cssShadow === '' ) {
			return '';
		}
		const preset = presetList.find( function ( p ) {
			return p.slug !== 'unset' && p.shadow === cssShadow;
		} );
		if ( preset ) {
			if ( String( preset.slug ).indexOf( 'bhb-' ) === 0 ) {
				return sanitizeScrolledShadowForOutput( String( preset.shadow ) );
			}
			return 'var:preset|shadow|' + preset.slug;
		}
		return sanitizeScrolledShadowForOutput( String( cssShadow ) );
	}

	/**
	 * @param {string} raw
	 * @param {{slug:string,shadow:string}[]} presets
	 * @return {string|undefined}
	 */
	function bhbDecodeShadowCssFromAttr( raw, presets ) {
		if ( ! raw || typeof raw !== 'string' ) {
			return undefined;
		}
		const t = raw.trim();
		if ( ! t ) {
			return undefined;
		}
		const m = /^var:preset\|shadow\|(.+)$/.exec( t );
		if ( m ) {
			const p = presets.find( function ( x ) {
				return x.slug === m[ 1 ];
			} );
			return p ? p.shadow : undefined;
		}
		return t;
	}

	/**
	 * @param {string} raw
	 * @return {string}
	 */
	function bhbResolveShadowForCssVar( raw ) {
		const t = String( raw || '' ).trim();
		if ( ! t ) {
			return '';
		}
		const m = /^var:preset\|shadow\|(.+)$/.exec( t );
		if ( m ) {
			const v = 'var(--wp--preset--shadow--' + m[ 1 ] + ')';
			return sanitizeScrolledShadowForOutput( v );
		}
		return sanitizeScrolledShadowForOutput( t );
	}

	/**
	 * Ícone do botão de sombra (equivalente ao shadow_default do core).
	 *
	 * @return {Object}
	 */
	function bhbElShadowGlyph() {
		return el(
			'svg',
			{
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				width: 24,
				height: 24,
				'aria-hidden': true,
				focusable: false,
			},
			el( 'path', { d: BHB_SHADOW_ICON_PATH } )
		);
	}

	/**
	 * Ícone do botão remover (equivalente ao reset do core).
	 *
	 * @return {Object}
	 */
	function bhbElResetGlyph() {
		return el(
			'svg',
			{
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				width: 24,
				height: 24,
				'aria-hidden': true,
				focusable: false,
			},
			el( 'path', { d: 'M7 11.5h10V13H7z' } )
		);
	}

	/**
	 * Check no preset ativo (como ShadowIndicator do core).
	 *
	 * @return {Object}
	 */
	function bhbElCheckGlyph() {
		return el(
			'svg',
			{
				xmlns: 'http://www.w3.org/2000/svg',
				viewBox: '0 0 24 24',
				width: 24,
				height: 24,
				'aria-hidden': true,
				focusable: false,
			},
			el( 'path', {
				d: 'M16.7 7.1l-7.1 7.1-2.8-2.8-1.4 1.4 4.2 4.2 8.5-8.5-1.4-1.4z',
			} )
		);
	}

	/**
	 * Lista de presets com a mesma marcação/CSS do ShadowPresets nativo.
	 *
	 * @param {Object} props
	 * @return {Object}
	 */
	function BhbShadowPresetsPanel( props ) {
		const presets = props.presets;
		const activeShadow = props.activeShadow;
		const onPickPreset = props.onPickPreset;
		const TooltipC = Tooltip;

		return el(
			'div',
			{
				role: 'listbox',
				className: 'block-editor-global-styles__shadow__list',
				'aria-label': __( 'Drop shadows', 'default' ),
			},
			presets.map( function ( p ) {
				const type = p.slug === 'unset' ? 'unset' : 'preset';
				const isActive =
					p.shadow === activeShadow ||
					( p.slug === 'unset' && ( ! activeShadow || activeShadow === 'none' ) );
				const button = el( 'button', {
					type: 'button',
					role: 'option',
					className:
						'block-editor-global-styles__shadow-indicator' + ( type === 'unset' ? ' unset' : '' ),
					style: { boxShadow: p.shadow },
					onClick: function () {
						onPickPreset( p );
					},
					'aria-label': p.name,
					'aria-selected': isActive,
					children: isActive ? bhbElCheckGlyph() : null,
				} );
				const row = el(
					'div',
					{ className: 'block-editor-global-styles__shadow__item' + ( isActive ? ' is-active' : '' ) },
					button
				);
				if ( TooltipC ) {
					return el( TooltipC, { key: p.slug, text: p.name }, row );
				}
				return el( Fragment, { key: p.slug }, row );
			} )
		);
	}

	/**
	 * Cor ao fixar no mesmo painel "Cor" do bloco (slot nativo).
	 *
	 * @param {Object} props
	 * @return {Object|null}
	 */
	function BhbScrolledBackgroundInspectorInner( props ) {
		const clientId = props.clientId;
		const attributes = props.attributes;
		const setAttributes = props.setAttributes;

		const colorData = useMultipleOriginColorsAndGradients();
		const stored = attributes.headerScrolledBackground ? String( attributes.headerScrolledBackground ) : '';

		const flatColors = useMemo(
			function () {
				return bhbFlattenColors( colorData.colors );
			},
			[ colorData.colors ]
		);

		const colorValue = useMemo(
			function () {
				return bhbDecodeColorForPicker( stored, flatColors );
			},
			[ stored, flatColors ]
		);

		const onColorChange = useCallback(
			function ( newColor ) {
				if ( newColor === undefined || newColor === null || newColor === '' ) {
					setAttributes( { headerScrolledBackground: '' } );
					return;
				}
				setAttributes( {
					headerScrolledBackground: bhbEncodeColorAttr( newColor, flatColors ),
				} );
			},
			[ setAttributes, flatColors ]
		);

		const setting = {
			label: __( 'Fundo ao fixar', 'block-header-behavior' ),
			colorValue: colorValue,
			onColorChange: onColorChange,
			clearable: true,
			enableAlpha: true,
		};

		return el(
			InspectorControls,
			{ group: 'color' },
			el(
				ColorGradientSettingsDropdown,
				Object.assign( {}, colorData, {
					panelId: clientId,
					settings: [ setting ],
					__experimentalIsRenderedInSidebar: true,
					enableAlpha: true,
				} )
			)
		);
	}

	/**
	 * Evita chamar hooks de cor quando a API experimental não existe na versão do WP.
	 *
	 * @param {Object} props
	 * @return {Object|null}
	 */
	function BhbScrolledBackgroundInspector( props ) {
		if ( ! bhbHasNativeColorDropdown ) {
			return null;
		}
		return el( BhbScrolledBackgroundInspectorInner, props );
	}

	/**
	 * Sombra ao fixar no painel "Borda" (mesmo ToolsPanel da sombra nativa).
	 *
	 * @param {Object} props
	 * @return {Object|null}
	 */
	function BhbScrolledShadowInspector( props ) {
		const clientId = props.clientId;
		const attributes = props.attributes;
		const setAttributes = props.setAttributes;

		const settings = useSelect( function ( select ) {
			return select( 'core/block-editor' ).getSettings();
		}, [] );

		const presets = useMemo(
			function () {
				return bhbGetShadowPresetsFromSettings( settings );
			},
			[ settings ]
		);

		const stored = attributes.headerScrolledShadow ? String( attributes.headerScrolledShadow ) : '';
		const activeCss = bhbDecodeShadowCssFromAttr( stored, presets );

		const onShadowChange = useCallback(
			function ( cssVal ) {
				if ( cssVal === undefined || cssVal === null || cssVal === '' ) {
					setAttributes( { headerScrolledShadow: '' } );
					return;
				}
				setAttributes( {
					headerScrolledShadow: bhbEncodeShadowFromPickerSelection( cssVal, presets ),
				} );
			},
			[ setAttributes, presets ]
		);

		const onPickPreset = useCallback(
			function ( preset ) {
				const sel = preset.shadow;
				const same =
					sel === activeCss ||
					( preset.slug === 'unset' && ( ! activeCss || activeCss === 'none' ) );
				const next = same ? undefined : preset.slug === 'unset' ? undefined : sel;
				onShadowChange( next );
			},
			[ activeCss, onShadowChange ]
		);

		const shadowButtonRef = useRef();

		const renderToggle = useCallback(
			function ( _ref ) {
				const onToggle = _ref.onToggle;
				const isOpen = _ref.isOpen;
				return el(
					Fragment,
					null,
					el(
						Button,
						{
							__next40pxDefaultSize: true,
							onClick: onToggle,
							className:
								'block-editor-global-styles__shadow-dropdown-toggle' + ( isOpen ? ' is-open' : '' ),
							'aria-expanded': isOpen,
							ref: shadowButtonRef,
							children: el(
								HStack,
								{ justify: 'flex-start' },
								el(
									'span',
									{ className: 'block-editor-global-styles__toggle-icon' },
									bhbElShadowGlyph()
								),
								el( FlexItem, null, __( 'Drop shadow', 'default' ) )
							),
						}
					),
					!! activeCss &&
						el( Button, {
							__next40pxDefaultSize: true,
							size: 'small',
							icon: bhbElResetGlyph(),
							label: __( 'Remove', 'default' ),
							className:
								'block-editor-global-styles__shadow-editor__remove-button' +
								( isOpen ? ' is-open' : '' ),
							onClick: function () {
								if ( isOpen ) {
									onToggle();
								}
								onShadowChange( undefined );
								if ( shadowButtonRef.current && shadowButtonRef.current.focus ) {
									shadowButtonRef.current.focus();
								}
							},
						} )
				);
			},
			[ activeCss, onShadowChange ]
		);

		return el(
			InspectorControls,
			{ group: 'border' },
			el(
				ToolsPanelItem,
				{
					label: __( 'Sombra ao fixar', 'block-header-behavior' ),
					hasValue: function () {
						return !! stored;
					},
					onDeselect: function () {
						setAttributes( { headerScrolledShadow: '' } );
					},
					isShownByDefault: false,
					panelId: clientId,
					children: el( Dropdown, {
						popoverProps: { placement: 'left-start', offset: 36, shift: true },
						className: 'block-editor-global-styles__shadow-dropdown',
						renderToggle: renderToggle,
						renderContent: function () {
							return el(
								DropdownContentWrapper,
								{ paddingSize: 'medium' },
								el(
									'div',
									{ className: 'block-editor-global-styles__shadow-popover-container' },
									el(
										VStack,
										{ spacing: 4 },
										ExperimentalHeading
											? el( ExperimentalHeading, { level: 5 }, __( 'Drop shadow', 'default' ) )
											: el(
													'h5',
													{ className: 'components-heading' },
													__( 'Drop shadow', 'default' )
											  ),
										el( BhbShadowPresetsPanel, {
											presets: presets,
											activeShadow: activeCss,
											onPickPreset: onPickPreset,
										} ),
										el(
											'div',
											{ className: 'block-editor-global-styles__clear-shadow' },
											el( Button, {
												__next40pxDefaultSize: true,
												variant: 'tertiary',
												onClick: function () {
													onShadowChange( undefined );
												},
												disabled: ! stored,
												accessibleWhenDisabled: true,
												children: __( 'Clear', 'default' ),
											} )
										)
									)
								)
							);
						},
					} )
				}
			)
		);
	}

	/**
	 * @param {Object|undefined} attributes
	 * @return {Record<string,string>}
	 */
	function buildScrolledCustomProperties( attributes ) {
		const bgRaw =
			attributes && attributes.headerScrolledBackground ? String( attributes.headerScrolledBackground ) : '';
		const shRaw =
			attributes && attributes.headerScrolledShadow ? String( attributes.headerScrolledShadow ) : '';
		const bg = bhbResolveBackgroundForCssVar( bgRaw );
		const sh = bhbResolveShadowForCssVar( shRaw );
		const style = {};
		if ( bg ) {
			style[ '--bhb-header-scrolled-bg' ] = bg;
		}
		if ( sh ) {
			style[ '--bhb-header-scrolled-shadow' ] = sh;
		}
		return style;
	}

	const withHeaderModeControls = createHigherOrderComponent( function ( BlockEdit ) {
		return function ( props ) {
			const showControls = isSiteHeaderGroup( props );
			const mode = sanitizeMode( props.attributes.headerMode || 'default' );
			const showScrolledStylePanel = showControls && ( mode === 'overlay' || mode === 'sticky' );
			const bgAttrFallback = props.attributes.headerScrolledBackground
				? String( props.attributes.headerScrolledBackground )
				: '';

			return el(
				Fragment,
				null,
				showControls &&
					el(
						InspectorControls,
						null,
						el(
							PanelBody,
							{
								title: __( 'Header Mode', 'block-header-behavior' ),
								initialOpen: true,
							},
							el( SelectControl, {
								label: __( 'Header Mode', 'block-header-behavior' ),
								value: mode,
								options: getModeOptions(),
								onChange: function ( value ) {
									props.setAttributes( { headerMode: sanitizeMode( value ) } );
								},
							} )
						)
					),
				showScrolledStylePanel &&
					el(
						Fragment,
						null,
						el( BhbScrolledBackgroundInspector, {
							clientId: props.clientId,
							attributes: props.attributes,
							setAttributes: props.setAttributes,
						} ),
						el( BhbScrolledShadowInspector, {
							clientId: props.clientId,
							attributes: props.attributes,
							setAttributes: props.setAttributes,
						} ),
						! bhbHasNativeColorDropdown &&
							el(
								InspectorControls,
								{ group: 'styles' },
								el(
									PanelBody,
									{
										title: __( 'Cabeçalho fixo: fundo (fallback)', 'block-header-behavior' ),
										initialOpen: false,
									},
									el( TextControl, {
										label: __( 'Cor de fundo ao fixar (CSS)', 'block-header-behavior' ),
										help: __(
											'Seletor nativo de cor indisponível nesta versão do WordPress. Use hex, rgb/rgba ou var(--wp--preset--color--…).',
											'block-header-behavior'
										),
										value: bgAttrFallback,
										onChange: function ( v ) {
											const t = typeof v === 'string' ? v.slice( 0, 800 ) : '';
											props.setAttributes( { headerScrolledBackground: t } );
										},
									} ),
									el( Button, {
										variant: 'secondary',
										isSmall: true,
										onClick: function () {
											props.setAttributes( { headerScrolledBackground: '' } );
										},
										text: __( 'Limpar cor de fundo', 'block-header-behavior' ),
									} )
								)
							)
					),
				el( BlockEdit, props )
			);
		};
	}, 'bhbWithHeaderModeControls' );

	addFilter( 'editor.BlockEdit', 'bhb/header-mode-inspector', withHeaderModeControls );

	addFilter(
		'blocks.getSaveContent.extraProps',
		'bhb/header-mode-save-class',
		function ( extraProps, blockType, attributes ) {
			if ( ! blockType || blockType.name !== BLOCK_NAME ) {
				return extraProps;
			}

			if ( ! isSiteHeaderAttributes( attributes ) ) {
				return extraProps;
			}

			const mode = sanitizeMode( ( attributes && attributes.headerMode ) || 'default' );
			const modeClass = 'header--' + mode;
			const merged = [ extraProps.className, modeClass ].filter( Boolean ).join( ' ' ).trim();

			const vars = buildScrolledCustomProperties( attributes );
			const base = Object.assign( {}, extraProps, { className: merged } );
			if ( ! Object.keys( vars ).length ) {
				return base;
			}
			base.style = Object.assign( {}, extraProps.style || {}, vars );
			return base;
		}
	);
}( window.wp ) );
