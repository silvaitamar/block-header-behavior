/**
 * Frontend: toggles `is-scrolled` on overlay headers for scroll-linked styles.
 *
 * @package block-header-behavior
 */
( function () {
	'use strict';

	var headers = document.querySelectorAll( '.header--overlay' );
	if ( ! headers.length ) {
		return;
	}

	function updateHeader( el ) {
		var scrolled = window.scrollY > 1;
		el.classList.toggle( 'is-scrolled', scrolled );
	}

	function bind( el ) {
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
		updateHeader( el );
		onScroll();
	}

	for ( var i = 0; i < headers.length; i++ ) {
		bind( headers[ i ] );
	}
}() );
