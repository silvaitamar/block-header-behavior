/**
 * Frontend + Site Editor canvas: toggles `is-scrolled` on overlay headers.
 *
 * Editor canvas mounts blocks asynchronously — observe DOM and bind late.
 * Scroll may be on window (front / iframe) or an overflow ancestor.
 *
 * @package block-header-behavior
 */
( function () {
	'use strict';

	var bound = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
	var boundFallback = [];

	function isBound( el ) {
		if ( bound ) {
			return bound.has( el );
		}
		return boundFallback.indexOf( el ) !== -1;
	}

	function markBound( el ) {
		if ( bound ) {
			bound.add( el );
			return;
		}
		if ( boundFallback.indexOf( el ) === -1 ) {
			boundFallback.push( el );
		}
	}

	function scrollTop() {
		var y = window.scrollY || window.pageYOffset || 0;
		if ( y > 0 ) {
			return y;
		}
		var doc = document.documentElement;
		var body = document.body;
		return Math.max(
			y,
			doc ? doc.scrollTop : 0,
			body ? body.scrollTop : 0
		);
	}

	function updateHeader( el ) {
		el.classList.toggle( 'is-scrolled', scrollTop() > 1 );
	}

	function bind( el ) {
		if ( ! el || isBound( el ) ) {
			return;
		}
		markBound( el );

		var ticking = false;
		function onScroll() {
			if ( ticking ) {
				return;
			}
			ticking = true;
			window.requestAnimationFrame( function () {
				updateHeader( el );
				ticking = false;
			} );
		}

		window.addEventListener( 'scroll', onScroll, { passive: true } );
		document.addEventListener( 'scroll', onScroll, { passive: true, capture: true } );
		updateHeader( el );
	}

	function scan() {
		var headers = document.querySelectorAll( '.header--overlay' );
		for ( var i = 0; i < headers.length; i++ ) {
			bind( headers[ i ] );
		}
	}

	scan();

	if ( typeof MutationObserver !== 'undefined' && document.documentElement ) {
		var mo = new MutationObserver( function () {
			scan();
		} );
		mo.observe( document.documentElement, { childList: true, subtree: true } );
	}
}() );
