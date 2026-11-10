/**
 * Yellow.ai — main theme script
 * =============================
 *
 * Merged from the former `js/index.js` and `js/index-v3.js` (2026-08-25).
 * `js/index-old.js` was deleted in the same change: it was enqueued nowhere,
 * referenced nowhere, and had never been requested once in any retained access log.
 *
 * WHY THIS FILE IS ONE FILE
 * -------------------------
 * The two sources were both bound as `jQuery(document).ready` callbacks against
 * the same DOM, so they were already one logical script split across two HTTP
 * requests. Merging removes a request and, more importantly, makes the genuine
 * collisions between them visible (see "MERGE HAZARDS" below).
 *
 * LAYOUT
 *   1.  Utilities                      — shared helpers, scroll dispatcher
 *   2.  Analytics                      — dataLayer / gtag helpers and events
 *   3.  Outbound link decoration       — UTM + page-source tagging
 *   4.  Header: legacy (.header-main .header-navbar)
 *   5.  Header: current (.header-main / .new-header-main .menu-section)
 *   6.  Header search
 *   7.  Footer
 *   8.  Media                          — audio, YouTube facades
 *   9.  Archives & AJAX loaders
 *   10. Site search
 *   11. Scroll behaviours              — sticky TOCs, anchors, page menus
 *   12. Modals & popups                — HubSpot modal, exit intent, partner
 *   13. HubSpot form enhancements      — country field sync
 *
 * MERGE HAZARDS THAT WERE RESOLVED
 * --------------------------------
 * Both files declared a top-level `showBlog()`. They were previously isolated in
 * separate ready-callback scopes and did DIFFERENT things — the index.js one
 * cleared `#search-ajax-input`, the index-v3.js one cleared `#search-blog-input`.
 * In a single scope the later declaration would have silently won and broken one
 * of the two search widgets. They are kept apart here as `resetLegacyBlogSearch()`
 * and `resetBlogSearch()`.
 *
 * Several selectors are bound by BOTH original files (`.hamburger`,
 * `#menu-search-btn`, `#menu-search-btn-close`). That is additive, not
 * duplication: they drive two different header generations that coexist in the
 * theme. Both bindings are preserved verbatim — removing either breaks one
 * header. See sections 4, 5 and 6.
 *
 * KNOWN PRE-EXISTING BEHAVIOUR, DELIBERATELY UNCHANGED
 * ----------------------------------------------------
 * `decorateRequestDemoLinks()` and `propagateQueryParamsToInternalLinks()` both
 * append query parameters to the same request-demo anchors, so those links can
 * end up with duplicated `utm_*` keys. The original index.js even carried a
 * comment promising an "already present" check that was never written. This is a
 * marketing-attribution behaviour change, not a refactor, so it is preserved
 * exactly as-is and flagged here rather than silently fixed.
 */

jQuery(document).ready(function ($) {
  'use strict';

  /* ===================================================================
   * 1. UTILITIES
   * =================================================================== */

  /**
   * Reads a query parameter out of a URL (or the current location).
   *
   * @param {string} name    Parameter name, e.g. "utm_source".
   * @param {string} [url]   Optional URL to read from; defaults to location.search.
   * @return {string|boolean} Decoded value, `true` for a valueless key, `false` if absent.
   */
  function getUrlParameter(name, url) {
    var query = typeof url === 'undefined' ? window.location.search.substring(1) : url.substring(url.indexOf('?') + 1);
    var pairs = query.split('&');

    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      if (pair[0] === name) {
        return pair[1] === undefined ? true : decodeURIComponent(pair[1]);
      }
    }
    return false;
  }

  /**
   * Every query parameter on the current URL, as a plain object.
   *
   * @return {Object.<string,string>}
   */
  function getQueryParameters() {
    var values = {};
    var params = new URLSearchParams(window.location.search);
    for (var entry of params.entries()) {
      values[entry[0]] = entry[1];
    }
    return values;
  }

  /**
   * Appends `key=value` to a URL, choosing `?` or `&` automatically.
   *
   * @param {string} url
   * @param {string} key
   * @param {string} value
   * @return {string}
   */
  function appendParam(url, key, value) {
    return url + (url.indexOf('?') !== -1 ? '&' : '?') + key + '=' + value;
  }

  /**
   * Resolves an anchor href of the form "#some-id" to its element.
   *
   * Mirrors the original `href.replace('#','')` semantics exactly (first "#"
   * only) so hrefs that were already handled a particular way keep behaving
   * identically.
   *
   * @param {string} href
   * @return {jQuery} Possibly-empty jQuery set.
   */
  function hashTarget(href) {
    if (!href) {
      return $();
    }
    return $('#' + $.escapeSelector(href.replace('#', '')));
  }

  /**
   * Smooth-scrolls the viewport to an element.
   *
   * Replaces roughly a dozen near-identical animate() blocks across the two
   * original files. Unlike most of those, this guards against a missing target:
   * the originals called `.offset().top` unguarded and threw a TypeError when
   * the anchor did not exist, aborting the rest of that click handler.
   *
   * @param {jQuery} $target          Element to scroll to.
   * @param {number} offset           Pixels added to the target's top (usually negative).
   * @param {number} duration         Animation duration in ms.
   * @param {Object} [opts]
   * @param {boolean} [opts.stop]     Cancel in-flight scroll animations first.
   * @param {string}  [opts.easing]   jQuery easing name, e.g. "swing".
   * @param {Function} [opts.complete] Completion callback.
   */
  function scrollToTarget($target, offset, duration, opts) {
    opts = opts || {};
    if (!$target || !$target.length) {
      return;
    }
    var $viewport = $('html, body');
    if (opts.stop) {
      $viewport.stop();
    }
    $viewport.animate({ scrollTop: $target.offset().top + offset }, duration, opts.easing, opts.complete);
  }

  /**
   * Binds a click handler that smooth-scrolls to the clicked anchor's hash.
   *
   * @param {string} selector  Delegated-free selector to bind on.
   * @param {number} offset    Pixel offset applied to the destination.
   * @param {number} duration  Animation duration in ms.
   * @param {Object} [opts]    Passed through to scrollToTarget().
   * @param {boolean} [rebind] Call .off('click') first (matches originals that did).
   */
  function bindAnchorScroll(selector, offset, duration, opts, rebind) {
    var $els = $(selector);
    if (rebind) {
      $els.off('click');
    }
    $els.on('click', function (e) {
      e.preventDefault();
      scrollToTarget(hashTarget($(this).attr('href')), offset, duration, opts);
    });
  }

  /**
   * Trailing-edge debounce.
   *
   * @param {Function} func
   * @param {number} wait
   * @param {boolean} [immediate] Fire on the leading edge instead.
   * @return {Function}
   */
  function debounce(func, wait, immediate) {
    var timeout;
    return function () {
      var context = this;
      var args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
        func.apply(context, args);
      }
    };
  }

  /* ---------------------------------------------------------------
   * Scroll dispatcher
   *
   * The originals registered four separate window scroll listeners, and one of
   * them leaked badly: index-v3.js called `newheaderFunction()` from inside a
   * scroll handler, and `newheaderFunction()` itself did
   * `$(window).on('scroll', ...)`. Every scroll event therefore registered
   * another permanent scroll listener — a few seconds of scrolling attached
   * hundreds of them, all doing layout reads.
   *
   * Everything now runs from a single listener, throttled to one animation
   * frame, which also collapses the repeated forced reflows the separate
   * handlers were each triggering.
   * --------------------------------------------------------------- */
  var scrollCallbacks = [];
  var scrollTicking = false;

  /**
   * Registers a function to run on scroll (rAF-throttled).
   * @param {Function} fn
   */
  function onScroll(fn) {
    scrollCallbacks.push(fn);
  }

  function runScrollCallbacks() {
    for (var i = 0; i < scrollCallbacks.length; i++) {
      scrollCallbacks[i]();
    }
    scrollTicking = false;
  }

  $(window).on('scroll', function () {
    if (!scrollTicking) {
      scrollTicking = true;
      window.requestAnimationFrame(runScrollCallbacks);
    }
  });

  /* ===================================================================
   * 2. ANALYTICS
   * =================================================================== */

  /**
   * Pushes an arbitrary payload onto the GTM dataLayer.
   * @param {Object} args
   */
  function pushDataLayer(args) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(args);
  }

  /**
   * The canonical `gtag()` shim, declared once.
   *
   * The originals redeclared this local function inside five separate handlers.
   * It MUST push the `arguments` object itself, not an array literal — GTM
   * detects an Arguments object to distinguish a gtag call from a plain
   * dataLayer message, so `push(['event', ...])` would not fire the same tags.
   */
  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  /* Orchestrator A/B buttons. */
  $('.gtm-trigger a').on('click', function () {
    var isOptionB = $(this).closest('.gtm-trigger').hasClass('orchestrator-option-b');
    gtag('event', isOptionB ? 'orchestrator_option_b_click' : 'orchestrator_option_a_click', {});
  });

  /* Front page hero demo button. */
  $('#fp-hero__button--demo a').on('click', function () {
    gtag('event', 'frontpage_hero_button_click', {});
  });

  /* Front page CTA button + Gravity Forms submit. */
  $('.yellow-front-page .sec-1 .front-page-button-div .btn').on('click', function () {
    pushDataLayer({
      event: 'customEvent',
      eventName: 'home_page_cta',
      eventCategory: 'click',
      eventAction: 'button',
      eventLabel: undefined
    });
  });

  $('.yellow-front-page .sec-1 .gform_wrapper form .gform_footer input[type=submit]').on('click', function () {
    pushDataLayer({
      event: 'customEvent',
      eventName: 'home_page_cta',
      eventCategory: 'click',
      eventAction: 'form',
      eventLabel: undefined
    });
  });

  /* Cookiebot consent. The consented/declined branches were already commented
     out upstream; preserved as-is so the event always reports "received". */
  window.addEventListener(
    'CookiebotOnLoad',
    function () {
      gtag('event', 'cookie_consent_received', {});
    },
    false
  );

  /* ===================================================================
   * 3. OUTBOUND LINK DECORATION
   * =================================================================== */

  /**
   * Copies this page's inbound utm_* parameters onto request-demo links.
   *
   * NOTE: no de-duplication is performed — see the file header. A link that
   * already carries utm_source will receive a second utm_source.
   */
  function decorateRequestDemoLinks() {
    var utmKeys = ['id', 'source', 'medium', 'campaign', 'content', 'term'];
    var utmValues = {};

    for (var i = 0; i < utmKeys.length; i++) {
      var key = 'utm_' + utmKeys[i];
      var value = getUrlParameter(key);
      if (value) {
        utmValues[key] = value;
      }
    }

    if ($.isEmptyObject(utmValues)) {
      return;
    }

    $("a[href*='yellow.ai/request-demo']").each(function () {
      var $link = $(this);
      var url = $link.attr('href');
      for (var key in utmValues) {
        if (Object.prototype.hasOwnProperty.call(utmValues, key)) {
          url = appendParam(url, key, utmValues[key]);
        }
      }
      $link.attr('href', url);
    });
  }

  /**
   * Appends `tags__c=<page title>` to a request-demo link so HubSpot records
   * which page the visitor came from.
   *
   * @param {Element} item
   */
  function addPageSourceTag(item) {
    var $link = $(item);
    var pageSource = $('.source-page-title').data('title');
    $link.attr('href', appendParam($link.attr('href'), 'tags__c', pageSource));
  }

  /**
   * Copies every current query parameter onto same-domain links.
   *
   * Skips links containing an anchor, and skips parameters that drive
   * server-side listing state (s, search, page, catList) — forwarding those
   * would corrupt the destination page's own query.
   */
  function propagateQueryParamsToInternalLinks() {
    var DOMAIN = 'https://yellow.ai';
    var SKIP = ['s', 'search', 'page', 'catList'];
    var params = getQueryParameters();

    $('a').each(function () {
      var $link = $(this);
      var href = $link.attr('href');

      if (!href || href.indexOf(DOMAIN) === -1 || href.indexOf('#') !== -1) {
        return;
      }

      for (var param in params) {
        if (Object.prototype.hasOwnProperty.call(params, param) && SKIP.indexOf(param) === -1) {
          href = appendParam(href, param, params[param]);
        }
      }

      $link.attr('href', href);
    });
  }

  decorateRequestDemoLinks();

  /* Locale-prefixed request-demo variants all get the same page-source tag. */
  ['', 'ar/', 'id/', 'en-ph/'].forEach(function (prefix) {
    $("a[href*='yellow.ai/" + prefix + "request-demo']").each(function () {
      addPageSourceTag(this);
    });
  });

  propagateQueryParamsToInternalLinks();

  /* ===================================================================
   * 4. HEADER — LEGACY (.menu-main .header-navbar)
   *
   * Drives the older mega-menu markup. Coexists with section 5; the two target
   * different DOM and both must stay bound.
   * =================================================================== */

  /**
   * Opens/closes a legacy mega-menu panel and (re)builds its sliders.
   *
   * @param {Event} event
   * @param {jQuery} $item  The clicked <li>.
   * @param {number} index  Its index within `linkSelector`.
   * @param {string} linkSelector
   */
  function menuOnClickHandler(event, $item, index, linkSelector) {
    event.preventDefault();

    /* Hide search */
    var $header = $item.parents('.header-main');
    $header.find('#menu-search-btn-close').fadeOut('600');
    $header.find(' #menu-search-btn').fadeIn('600');
    $header.find('.search-desktop-menu').hide();

    if ($item.hasClass('active')) {
      $('.drop-down-menu').slideUp(600, function () {
        $('.dd-sec').hide();
        $('.drop-down-menu').removeClass('active');
        $(linkSelector).removeClass('active');
        $('.menu-overlay').fadeOut();
      });
      $('.menu-overlay').fadeOut();
      return;
    }

    if ($('.drop-down-menu').is(':visible')) {
      if (!$('.dd-sec').eq(index).is(':visible')) {
        $('.dd-sec')
          .not(':eq(' + index + ')')
          .slideUp();
        $('.dd-sec').eq(index).slideDown();
      }
    } else {
      $('.menu-overlay').fadeIn();
      $('.dd-sec').hide();
      $('.dd-sec').eq(index).show();
      $('.drop-down-menu').slideDown(600, function () {
        $('.menu-overlay').fadeIn();
        $('.drop-down-menu').addClass('active');
      });
    }

    $(linkSelector).removeClass('active');
    $(linkSelector).eq(index).addClass('active');

    initMenuSlider('.yellow-menu-slider', '.menu-slider-div', { dots: true });
    initMenuSlider('.yellow-menu-featured-slider', '.slider-feature-menu-div', { dots: false, variableWidth: true });
  }

  /**
   * Re-initialises a slick slider inside an open menu panel.
   *
   * Slick must be torn down and rebuilt because the panel was display:none when
   * it was first initialised and therefore measured at zero width.
   *
   * @param {string} wrapSelector
   * @param {string} sliderSelector
   * @param {Object} options  Slider-specific overrides.
   */
  function initMenuSlider(wrapSelector, sliderSelector, options) {
    var $sliders = $(wrapSelector + ' ' + sliderSelector);
    if (!$sliders.length) {
      return;
    }

    $sliders.each(function () {
      var $slider = $(this);
      var $pager = $slider.parents(wrapSelector).find('.pager');

      $slider.slick('unslick');
      $slider.slick(
        $.extend(
          {
            infinite: true,
            slidesToShow: 1,
            slidesToScroll: 1,
            appendDots: $pager.find('.pages'),
            prevArrow: $pager.find('.prev'),
            nextArrow: $pager.find('.next')
          },
          options
        )
      );
    });
  }

  $('.menu-main .header-navbar .header-nav li').on('click ', function (event) {
    menuOnClickHandler(event, $(this), $(this).index(), '.menu-main .header-navbar .header-nav li');
  });

  /* Mobile language switcher. */
  $('.translate_wrapper-mobile .current_lang').on('click', function (e) {
    e.preventDefault();
    $('.translate_wrapper-mobile .more-lang-block').slideToggle('600');
    $('.dd-header').each(function () {
      if ($(this).hasClass('active')) {
        $(this).removeClass('active');
        $(this).closest('.dd-sec').find('.dd-body-mobile').slideUp('600');
      }
    });
  });

  /**
   * Language dropdown toggle, shared by the desktop and mobile variants.
   *
   * @param {string} headerSelector
   * @param {string} sectionSelector
   */
  function bindLanguageDropdown(headerSelector, sectionSelector) {
    $(headerSelector).on('click', function () {
      var $item = $(this);
      if ($item.hasClass('active')) {
        $item.removeClass('active');
        $item.closest(sectionSelector).find('.dd-body').slideUp('600');
      } else {
        $(headerSelector).addClass('active');
        $(headerSelector).closest(sectionSelector).find('.dd-body').slideDown('600');
      }
    });
  }

  bindLanguageDropdown('.dd-header', '.dd-sec-language');
  bindLanguageDropdown('.dd-header-mobile', '.dd-sec-language-mobile');

  /* Legacy hamburger. Section 5 binds `.hamburger` too — both are required. */
  $('.hamburger').on('click', function (e) {
    e.preventDefault();
    $('.main-menu-block').slideToggle('slow');
  });

  /* ===================================================================
   * 5. HEADER — CURRENT (.header-main / .new-header-main .menu-section)
   * =================================================================== */

  /* Rotating announcement bar.
   *
   * On mobile the slides cross-fade in place. slideUp/slideDown animates each
   * slide's height, so the bar collapsed to 0 and reopened on every switch -
   * the whole header jumped, badly on mobile where slides wrap to different
   * line counts. Below 1024px the stylesheet stacks every slide in one grid
   * cell (see .top-header-slider in scss/_header.scss) so the bar is always as
   * tall as its tallest slide and its height never changes; here we only move
   * the .is-active flag and let CSS fade. .is-rotating tells CSS that JS has
   * taken over from the :first-child fallback.
   *
   * Desktop keeps the original slide - every slide is a single line there, so
   * the height barely moves. The breakpoint matches @mixin mobile. */
  var $announcementBar = $('.top-header-slider');
  var $announcementSlides = $announcementBar.find('.single-header-slider');
  if ($announcementSlides.length > 1) {
    var announcementIndex = 0;
    var announcementFade = window.matchMedia('(max-width: 1023px)');

    /** Puts the bar into the mode the current viewport calls for, showing
     *  whichever slide is due. Clears the other mode's leftovers: slideUp
     *  writes inline display/height, which would otherwise pin a slide shut. */
    function resetAnnouncementBar() {
      $announcementSlides.stop(true, true).css({ display: '', height: '', opacity: '' });
      if (announcementFade.matches) {
        $announcementBar.addClass('is-rotating');
        $announcementSlides.removeClass('is-active');
        $($announcementSlides[announcementIndex]).addClass('is-active');
      } else {
        $announcementBar.removeClass('is-rotating');
        $announcementSlides.removeClass('is-active').hide();
        $($announcementSlides[announcementIndex]).show();
      }
    }

    resetAnnouncementBar();

    if (announcementFade.addEventListener) {
      announcementFade.addEventListener('change', resetAnnouncementBar);
    } else if (announcementFade.addListener) {
      announcementFade.addListener(resetAnnouncementBar);
    }

    setInterval(function () {
      var nextIndex = (announcementIndex + 1) % $announcementSlides.length;
      var $current = $($announcementSlides[announcementIndex]);
      var $next = $($announcementSlides[nextIndex]);
      if (announcementFade.matches) {
        $current.removeClass('is-active');
        $next.addClass('is-active');
      } else {
        $current.slideUp(500);
        $next.slideDown(500);
      }
      announcementIndex = nextIndex;
    }, 3500);
  }

  $('.top-header .close').on('click', function (e) {
    e.preventDefault();
    $('.top-header-slider').slideUp();
    $('body').removeClass('hellobar-classname');
  });

  /* --- Header scroll state ------------------------------------------- */

  var $legacyHeader = $('.header-main');
  var $newHeader = $('.new-header-main');
  var lastScrollTop = 0;
  var HEADER_HIDE_THRESHOLD = 500;

  /** Adds `.scroll` to both header generations once the page leaves the top. */
  function updateHeaderScrollState() {
    if (window.scrollY > 0) {
      $legacyHeader.addClass('scroll');
      $newHeader.addClass('scroll');
    } else {
      $legacyHeader.removeClass('scroll');
      $newHeader.removeClass('scroll');
    }
  }

  /** Hides the new header while scrolling down past the threshold. */
  function updateHeaderVisibility() {
    var currentScrollTop = window.scrollY;

    if (currentScrollTop > 0) {
      $newHeader.addClass('scroll');
    } else {
      $newHeader.removeClass('scroll');
    }

    if (currentScrollTop > HEADER_HIDE_THRESHOLD) {
      if (currentScrollTop !== lastScrollTop) {
        if (currentScrollTop > lastScrollTop) {
          $newHeader.addClass('header-hidden');
        } else {
          $newHeader.removeClass('header-hidden');
        }
      }
    } else {
      $newHeader.removeClass('header-hidden');
    }

    lastScrollTop = currentScrollTop;
  }

  onScroll(updateHeaderScrollState);
  onScroll(updateHeaderVisibility);
  updateHeaderScrollState();

  /* --- Mega-menu panels ---------------------------------------------- */

  /**
   * Binds the current mega-menu open/close behaviour for a header root.
   *
   * Desktop (>1024px) fades panels; mobile slides them.
   *
   * @param {string} rootSelector
   */
  function bindMenuSection(rootSelector) {
    $(rootSelector + ' .menu-section .menu-single').on('click', function (e) {
      e.preventDefault();

      var $trigger = $(this);
      var panelId = $trigger.data('menuid');
      var isDesktop = $(window).width() > 1024;
      var $panel = $('#' + panelId);

      /* The legacy header shares its search UI with this menu. */
      if (rootSelector === '.header-main') {
        var $header = $trigger.parents('.header-main');
        $header.find('#menu-search-btn-close').fadeOut('600');
        $header.find(' #menu-search-btn').fadeIn('600');
        $header.find('.search-desktop-menu').hide();
      }

      if ($trigger.hasClass('active')) {
        $trigger.removeClass('active');
        if (isDesktop) {
          $panel.fadeOut();
        } else {
          $panel.slideUp();
        }
        return;
      }

      $(rootSelector + ' .menu-section .menu-single').removeClass('active');
      $trigger.addClass('active');

      $(rootSelector + ' .menu-single-content').each(function () {
        var $open = $(this);
        if ($open.is(':visible')) {
          if (isDesktop) {
            $open.fadeOut();
          } else {
            $open.slideUp();
          }
        }
      });

      if (isDesktop) {
        $panel.fadeIn();
      } else {
        $panel.slideDown();
      }
    });
  }

  bindMenuSection('.header-main');
  bindMenuSection('.new-header-main');

  /* Click-outside closes the open mega-menu panel. */
  $('body').on('click', function (e) {
    var root = $newHeader.length ? '.new-header-main' : '.header-main';
    var $target = $(e.target);

    var outside = !$target.closest(root + ' .menu-section').length && !$target.is(root + ' .menu-section');
    var onBackdrop = $target.is(root + ' .menu-single-content-flex');

    if (outside || onBackdrop) {
      $(root + ' .menu-section .menu-single').removeClass('active');
      $('.menu-single-content').fadeOut();
    }
  });

  /* Current hamburger. Section 4 binds `.hamburger` too — both are required. */
  $('.hamburger').on('click', function (e) {
    e.preventDefault();
    $('.menu-section').fadeToggle();
    $('.menu-overlay').fadeToggle();
    $(this).toggleClass('active');
    $('.top-header-slider').toggleClass('active');
  });

  $('.menu-overlay').on('click', function () {
    $(this).fadeOut();
    $('.hamburger').toggleClass('active');
    $('.drop-down-menu').toggleClass('active').slideUp();
    $('.search-desktop-menu').slideUp('600');
    $('.header-navbar #menu-header-menu li').removeClass('active');
    $('.menu-main-right-search #menu-search-btn-close').fadeOut();
    $('.menu-main-right-search #menu-search-btn').fadeIn();
    if ($(window).width() < 1024) {
      $('.menu-section').fadeOut();
    }
  });

  /* Language code shortened to two characters, e.g. "English" -> "En". */
  var $languageLabel = $('.wpml-ls-item-toggle span.wpml-ls-native');
  $languageLabel.text($languageLabel.text().substring(0, 2));

  /* ===================================================================
   * 6. HEADER SEARCH
   *
   * Both original files bound these two IDs, closing different menu
   * generations. Both handlers are retained.
   * =================================================================== */

  $('#menu-search-btn').on('click', function (e) {
    e.preventDefault();
    /* Legacy header: close the mega-menu dropdown. */
    $(this).closest('.header-main').find('.drop-down-menu').removeClass('active').hide();
    $(this).closest('.header-main').find('.menu-main .header-nav li').removeClass('active');
    /* Current header: close the menu panels. */
    $(this).closest('.header-main').find('.menu-single').removeClass('active');
    $(this).closest('.header-main').find('.menu-single-content').hide();

    $(this).fadeOut('600');
    $('#menu-search-btn-close').fadeIn('600');
    $('.search-desktop-menu').slideDown('600');
    $('.menu-overlay').fadeIn('600');
  });

  $('#menu-search-btn-close').on('click', function (e) {
    e.preventDefault();
    $(this).fadeOut('600');
    $('#menu-search-btn').fadeIn('600');
    $('.search-desktop-menu').slideUp('600');
    $('.menu-overlay').fadeOut('600');
  });

  /* ===================================================================
   * 7. FOOTER
   * =================================================================== */

  /**
   * Footer menu columns: collapsed on mobile, first column open on desktop.
   * Ran identically on load and on resize in the original.
   */
  function layoutFooterMenu() {
    var $items = $('.footer-menu-section .menu > li');
    $items.removeClass('active');
    $items.find('.sub-menu').hide();

    if ($(window).width() >= 1024) {
      $('.footer-menu-section .menu > li:first-child').addClass('active').find('.sub-menu').slideDown();
      $('.footer-menu-section #menu-footer-menu-2 > li').addClass('active').find('.sub-menu').slideDown();
    }
  }

  if ($('.footer-menu-section').length) {
    layoutFooterMenu();
    $(window).on('resize', layoutFooterMenu);
  }

  $('.footer-menu-section .menu-item-has-children > a').on('click', function (e) {
    e.preventDefault();
    $(this).closest('li').toggleClass('active').find('.sub-menu').slideToggle();
  });

  /* Newer footer accordion (mobile only). */
  $('.main-footer .footer-menu .header6').on('click', function (e) {
    if ($(window).width() < 1024) {
      e.preventDefault();
      $(this).toggleClass('active');
      $(this).next().find('.menu').slideToggle();
    }
  });

  if ($(window).width() < 1023) {
    $('.main-footer .footer-menu').first().find('.header6').addClass('active');
    $('.main-footer .footer-menu').first().find('.menu').slideDown();
  }

  /* Column headings are labels, not links. */
  $('.footer-menu-header > a').on('click', function (e) {
    e.preventDefault();
  });

  /* Expandable footer bottom (legal/SEO block). */
  $('.footer-seperator div').on('click', function (e) {
    e.preventDefault();
    var $toggle = $(this);
    if ($toggle.hasClass('active')) {
      $toggle.removeClass('active');
      $('.footer-bottom').slideUp();
    } else {
      $('html, body').animate({ scrollTop: $(document).height() }, 1000);
      $toggle.addClass('active');
      $('.footer-bottom').slideDown();
    }
  });

  /* ===================================================================
   * 8. MEDIA
   * =================================================================== */

  $('.audio-mute').on('click', function () {
    var $audio = $(this).closest('.wp-block-columns').find('audio');
    var muted = $audio.prop('muted');
    $audio.prop('muted', !muted);
    $(this).toggleClass('active', muted);
  });

  $('.audio-play').on('click', function () {
    var $audio = $(this).closest('.wp-block-columns').find('audio');
    if (!$audio.length) {
      return;
    }
    if ($audio[0].paused === false) {
      $audio.trigger('pause');
      $(this).removeClass('active');
    } else {
      $audio.trigger('play');
      $(this).addClass('active');
    }
  });

  /* YouTube facade: swap the poster for the real iframe on click. */
  $('.youtube-preview-div').on('click', function (e) {
    e.preventDefault();
    var $preview = $(this);
    $preview.fadeOut();
    $preview.parents('.youtube-div').find('iframe').attr('src', $preview.data('source'));
  });

  /* GLightbox for the RFP hero video button. */
  if ($('.rfp-yt-btn-popup').length && typeof GLightbox === 'function') {
    GLightbox({ selector: '.rfp-yt-btn-popup' });
  }

  /* Resize the experience iframe to its reported content height. */
  window.addEventListener(
    'message',
    function (event) {
      if (event.data && event.data.type === 'scrollHeight') {
        $('.experience-iframe').height(event.data.message);
      }
    },
    true
  );

  /* ===================================================================
   * 9. ARCHIVES & AJAX LOADERS
   * =================================================================== */

  /**
   * Wires an archive section to load category/pagination links over AJAX,
   * replacing the section's markup in place.
   *
   * Four copies of this existed in index-v3.js — each wrapped in a redundant
   * nested `$(document).ready()` — differing only in the section selector.
   *
   * @param {string} sectionSelector  e.g. ".archive-webinar-section"
   * @param {string} linkSelector     Delegated selector for the trigger links.
   */
  function bindArchiveAjaxLoader(sectionSelector, linkSelector) {
    $(document).on('click', linkSelector, function (e) {
      e.preventDefault();

      var $section = $(this).parents(sectionSelector);
      var sectionId = '#' + $section.attr('id');
      var url = $(this).data('href') + sectionId;

      $section.addClass('loader');
      $.get(url, function (data) {
        $section.html($(data).find(sectionId).html());
        $section.removeClass('loader');
      });
    });
  }

  ['.archive-webinar-section', '.archive-guide-section', '.newsroom-section'].forEach(function (section) {
    bindArchiveAjaxLoader(section, section + ' .category-div .category-left a, ' + section + ' .blog-each-cat .wp-pagenavi a');
  });

  bindArchiveAjaxLoader('.blog-list', '.blog-list .blog-each-cat .wp-pagenavi a');

  /* Knowledge-base "read more": append the next page's items. */
  $(document).on('click', '.knowledge-readmore', function (e) {
    e.preventDefault();

    var $button = $(this);
    var url = $button.attr('href');
    var $list = $button.parents('.blog-list');
    var $items = $button.parents('.bec-flex');
    var listId = '#' + $list.attr('id');

    $('.archive-webinar-section').addClass('loader');
    $.get(url, function (data) {
      $items.append($(data).find(listId).find('.bec-flex').html());
      $('.archive-webinar-section').removeClass('loader');
      $button.closest('.button-div').remove();
    });
  });

  /* Generic archive load-more. */
  $(document).on('click', '.archive-load-more', function (e) {
    e.preventDefault();

    var $button = $(this).closest('.button-div');
    var $section = $(this).parents('.archive-list-section');
    var url = $(this).attr('href');
    var LIST_ID = '#archive-list';

    if ($(this).data('slug') === 'guides') {
      url = url + '/?paged=' + $(this).data('page');
    }

    $section.addClass('loader');
    $.get(url, function (data) {
      $button.remove();
      $(LIST_ID).append($(data).find(LIST_ID).html());
      $section.removeClass('loader');
    });
  });

  /* Blog category filter pills. */
  $(document).on('click', '.filter-select', function () {
    var $pill = $(this);
    if ($pill.hasClass('active')) {
      return;
    }

    $('.filter-select').removeClass('active');
    $pill.addClass('active');

    var url = $('.filter-view').data('url') + '?catList=' + [$pill.data('cat')].toString();
    var search = $pill.data('search');
    if (search && search !== '') {
      url = url + '&search=' + search;
    }

    $('.archive-list-section').addClass('loader');
    $.get(url, function (data) {
      $('#archive-list').html($(data).find('#archive-list').html());
      $('.archive-list-section').removeClass('loader');
    });
  });

  /* Blog listing "load more" (admin-ajax). */
  $('body').on('click', '.blogloadmore', function (e) {
    e.preventDefault();

    var $button = $(this);
    var cat = $button.data('cat');

    $.ajax({
      type: 'POST',
      url: $('.ajax-url').data('url'),
      data: {
        identifier: 'loadmore',
        paged: parseInt($button.data('paged'), 10),
        cat: cat,
        slug: $button.data('slug'),
        taxonomy: $button.data('taxonomy'),
        action: 'f711_get_post_content'
      },
      beforeSend: function () {
        $button.find('img').hide();
        $button.find('p').text('Loading');
      },
      success: function (result) {
        $button.closest('.button-div').remove();
        $button.remove();
        $('.blog-each-cat.' + cat + ' .bec-flex').append(result);
      },
      error: function () {
        $button.find('img').show();
        $button.find('p').text('Load more');
        alert('An error has error. Please try again later.');
      }
    });
  });

  /* Author archive "load more". */
  $('body').on('click', '.authorloadmore', function (e) {
    e.preventDefault();

    var $button = $(this);

    $.ajax({
      type: 'POST',
      url: $('.ajax-url').data('url'),
      data: {
        identifier: 'authorloadmore',
        paged: parseInt($button.data('paged'), 10),
        author: $button.data('author'),
        action: 'f711_get_post_content'
      },
      beforeSend: function () {
        $button.text('Loading');
      },
      success: function (result) {
        $button.closest('.button-div').remove();
        $('.blog-each-cat.all .bec-flex').append(result);
      },
      error: function () {
        $button.text('Load more');
        alert('An error has error. Please try again later.');
      }
    });
  });

  /* Deep-linked archive pages jump straight to the listing. */
  if ($('.blog-archive-page').length) {
    var archiveUrl = window.location.href;
    if (archiveUrl.indexOf('?page=') !== -1 || archiveUrl.indexOf('&page=') !== -1) {
      scrollToTarget($('#webinar-section'), 0, 0);
    }
  }

  if ($('.blogpage-scrollTo').length) {
    scrollToTarget($('.blogpage-scrollTo'), -150, 0);
  }

  /* ===================================================================
   * 10. SITE SEARCH
   * =================================================================== */

  /**
   * Resets the legacy blog search widget (`#search-ajax-input`).
   *
   * Was `showBlog()` in index.js. Renamed because index-v3.js declared an
   * unrelated function of the same name — see the file header.
   */
  function resetLegacyBlogSearch() {
    $('.blog-list').show();
    $('.search-list').hide();
    $('#search-ajax-input').val('');
  }

  /**
   * Resets the current blog search widget (`#search-blog-input`).
   * Was `showBlog()` in index-v3.js.
   */
  function resetBlogSearch() {
    $('.blog-list').show();
    $('.search-list').hide();
    $('#search-blog-input').val('');
  }

  /** Reads the selected post-type filters and syncs their checkbox artwork. */
  function getSearchFilter() {
    var ICON_BASE = 'https://yellow.ai/wp-content/themes/yellow.ai/img/v2/';
    var SELECTED = ICON_BASE + 'select-purple-yes.svg';
    var UNSELECTED = ICON_BASE + 'x-circle-nb.svg';
    var selected = [];

    $('.filter-checkbox').each(function () {
      var $box = $(this);
      var checked = $box.is(':checked');

      $box.toggleClass('selected', checked);
      $box
        .closest('.checkbox-container')
        .find('img')
        .attr('src', checked ? SELECTED : UNSELECTED);

      if (checked) {
        selected.push($box.val());
      }
    });

    var $all = $('.checkbox-all');
    $all.toggleClass('disabled', selected.length > 0);
    $all
      .closest('.checkbox-container')
      .find('img')
      .attr('src', selected.length ? UNSELECTED : SELECTED);

    return selected.length ? selected.join(',') : 'all';
  }

  /**
   * Runs a search request and renders the results.
   *
   * @param {string} search    Query string.
   * @param {number} paged     Page number.
   * @param {boolean} clearAll Replace results instead of appending.
   * @param {jQuery|false} $button  The "load more" button, when appending.
   */
  function searchAjax(search, paged, clearAll, $button) {
    $.ajax({
      type: 'POST',
      url: $('.ajax-url').data('url'),
      data: {
        identifier: 'searchloadmore',
        paged: paged,
        search: search,
        post_type: getSearchFilter(),
        action: 'f711_get_post_content'
      },
      beforeSend: function () {
        if ($button) {
          $button.text('Loading');
        }
        if (clearAll) {
          $('.loading-page').addClass('active');
        }
      },
      success: function (result) {
        if (clearAll) {
          $('.search-wrap').empty().append(result);
          $('.loading-page').removeClass('active');

          var postCount = $('.search-total-count').data('count');
          if (postCount > 0) {
            $('.search-result h1').html('Search results for <span>“' + search + '”</span>');
            $('.search-result p').text('Found ' + postCount + ' results for “' + search + '”');
          } else {
            $('.search-result h1').html("<span>Oh snap! We couldn't find any matches for this search.</span>");
            $('.search-result p').text('Try correcting any misspelled words, changing filters, or search for something else.');
          }
          return;
        }

        if ($button) {
          $button.closest('.button-div').remove();
        }
        $('.search-total-count').remove();
        $('.search-wrap').append(result);
      },
      error: function () {
        if ($button) {
          $button.text('Load more');
        }
        if (clearAll) {
          $('.loading-page').removeClass('active');
        }
        alert('An error has error. Please try again later.');
      }
    });
  }

  $('body').on('click', '.searchblogloadmore', function (e) {
    e.preventDefault();
    searchAjax($(this).data('search'), $(this).data('paged'), false, $(this));
  });

  $('.filter-checkbox').on('change', function () {
    searchAjax($('.search-filter-div').data('search'), 0, true, false);
  });

  $('body').on('click', '.close-search', function (e) {
    e.preventDefault();
    $(this).closest('form').find('input').val('');
  });

  if ($(window).width() < 781) {
    $(document).on('click', '.search-filter', function () {
      $(this).next('.search-filter-div').toggle();
    });
  }

  $('.search-div button').on('click', function () {
    if ($('.search-desktop-menu-blog').is(':visible') && $('.search-list').is(':visible')) {
      resetLegacyBlogSearch();
    }
    $('.search-desktop-menu-blog').slideToggle('600');
  });

  /* Type-ahead blog search. */
  $('body').on(
    'input',
    '#search-blog-input',
    debounce(function (e) {
      var text = e.target.value;

      if (text === '') {
        resetBlogSearch();
        return;
      }

      $('.blog-list').hide();
      $('.search-list').show();
      $('.loading-div').addClass('active');

      $.get($(this).data('url') + '?search=' + text, function (data) {
        $('#search-list').html($(data).find('#blog-list').html());
        $('.loading-div').removeClass('active');
      });
    }, 1000)
  );

  /* ===================================================================
   * 11. SCROLL BEHAVIOURS
   * =================================================================== */

  /** Sticky table-of-contents for single posts, plus active-heading tracking. */
  function postTocScroll() {
    var $leftContent = $('.single-content-wrap .left-content');
    if (!$leftContent.length) {
      return;
    }

    var scrollTop = $(window).scrollTop();
    var sidebarTop = $leftContent.offset().top - 90;
    var bottomHeight = Math.min($('.single-content-wrap .fit_content').height() - 90, $(window).height() - 90);
    var sidebarBottom = $leftContent.offset().top - 90 + $leftContent.height() - bottomHeight - 90;
    var withinRange = sidebarBottom > scrollTop && scrollTop > sidebarTop;

    if (withinRange) {
      if ($(window).width() > 1024) {
        $('.single-content-wrap .fit_content').addClass('sticky');
      }
    } else {
      $('.single-content-wrap .fit_content').removeClass('sticky');
      $leftContent.toggleClass('stick-bottom', sidebarBottom <= scrollTop);
    }

    $('.bd_toc_content_list_item li').removeClass('parent');
    $('.bd_toc_content_list_item a').each(function () {
      var $link = $(this);
      var $heading = $($link.attr('href'));

      if ($heading.length && scrollTop > $heading.offset().top - 170) {
        $('.bd_toc_content_list_item a').removeClass('active');
        $link.addClass('active');

        if ($link.closest('.menu_level_2').length && $link.closest('li').hasClass('current')) {
          $('.bd_toc_content_list_item li').removeClass('parent');
          $link.closest('.menu_level_2').closest('li').addClass('parent');
        }
      }
    });

    var $activeToc = $('.bd_toc_content_list_item a.active');
    if ($activeToc.length && withinRange) {
      $activeToc[0].scrollIntoView({ behavior: 'smooth' });
    }

    $('.bd_toc_header').off('click');
  }

  /** Sticky sidebar + anchor tracking for long-form guide pages. */
  function guideScroll() {
    if (!$('.side-anchor-scroll').length) {
      return;
    }

    var scrollTop = $(window).scrollTop();
    var $wrap = $('.side-anchor-scroll-wrap');
    var sidebarTop = $wrap.offset().top - 90;
    var bottomHeight = Math.min($('.side-anchor-scroll').height() - 90, $(window).height() - 90);
    var sidebarBottom = $wrap.offset().top - 90 + $wrap.height() - bottomHeight - 90;
    var withinRange = sidebarBottom > scrollTop && scrollTop > sidebarTop;

    if (withinRange) {
      $('.side-anchor-scroll').addClass('sticky');
    } else {
      $('.side-anchor-scroll').removeClass('sticky');
      $('.mobile-select-wrap').removeClass('sticky');
      $wrap.toggleClass('stick-bottom', sidebarBottom <= scrollTop);
    }

    $('.single-anchor').each(function () {
      var $anchor = $(this);
      var $heading = hashTarget($anchor.attr('href'));

      if ($heading.length && scrollTop > $heading.offset().top - 170) {
        $('.single-anchor').removeClass('active');
        $anchor.addClass('active');

        if ($anchor.hasClass('subchapter')) {
          $anchor.prev('.single-anchor-parent').addClass('current-parent');
        } else {
          $('.single-anchor').removeClass('current-parent');
        }
      }
    });

    var $activeAnchor = $('.single-anchor.active');
    if ($activeAnchor.length && withinRange) {
      $activeAnchor[0].scrollIntoView({ behavior: 'smooth' });
    }

    var $guideBody = $('.single-guide-body');
    if ($guideBody.length) {
      var mobileTop = $guideBody.offset().top;
      var mobileBottom = $guideBody.offset().top - 100 + $guideBody.height() - 100;
      $('.mobile-select-wrap').toggleClass('sticky', mobileBottom > scrollTop && scrollTop > mobileTop);
    }

    $('.mobile-dropdown option').each(function () {
      var value = $(this).val();
      var $heading = hashTarget(value);
      if ($heading.length && scrollTop > $heading.offset().top - 175) {
        $('.mobile-dropdown').val('#' + $.escapeSelector(value.replace('#', '')));
      }
    });
  }

  /** Highlights the in-page menu entry matching the current scroll position. */
  function checkPageMenu() {
    var scrollPosition = $(window).scrollTop();

    $('.page-menu-section a').each(function () {
      var $link = $(this);
      var $section = $($link.attr('href'));

      if ($section.length && scrollPosition >= $section.offset().top - 200) {
        $('.page-menu-section a').removeClass('active');
        $link.addClass('active');
      }
    });
  }

  /** Shows the floating share rail while the article body is in view. */
  function updateFloatingShare() {
    var $share = $('.single-post-share-float');

    if ($('.single-body-new').length) {
      var divOffset = $('.single-body-new').offset().top;
      var divHeight = $('.single-body-new').outerHeight();
      var windowHeight = $(window).height();
      var scrollPos = $(window).scrollTop();

      if (scrollPos >= divOffset && scrollPos < divOffset + divHeight - windowHeight) {
        $share.css({ display: 'flex' });
      }
      if (scrollPos + windowHeight >= divOffset + divHeight && scrollPos >= divOffset) {
        $share.css({ display: 'none' });
      }
    }

    if ($('body.single-podcast').length && $('.podcast-listen-on').length) {
      var podcastOffset = $('.podcast-listen-on').offset().top;
      $share.css({ display: $(window).scrollTop() >= podcastOffset ? 'flex' : 'none' });
    }
  }

  onScroll(postTocScroll);
  onScroll(guideScroll);
  onScroll(updateFloatingShare);
  postTocScroll();
  guideScroll();

  if ($('.page-menu-section').length) {
    onScroll(checkPageMenu);
    checkPageMenu();
  }

  /* --- Anchor scrolling ---------------------------------------------- */

  bindAnchorScroll('.bd_toc_content_list_item a, .auto-scroll a', -160, 1000, {}, true);
  bindAnchorScroll('.page-menu-section a', -160, 1000, {}, true);
  bindAnchorScroll('.entry-content .scroll-to-list a', -160, 1000);
  bindAnchorScroll('.case-study-single .sec-5 .wp-block-columns p>a', -75, 2000);
  bindAnchorScroll('a.scroll-to-button, .scroll-to-button a', -200, 600, { stop: true, easing: 'swing' });
  bindAnchorScroll('a.scroll-to-bottom-button, .scroll-to-bottom-button a', 50, 600, { stop: true, easing: 'swing' });

  /* Guide sidebar anchors — `.link` entries navigate away instead. */
  $('.single-anchor').on('click', function (e) {
    if ($(this).hasClass('link')) {
      return;
    }
    e.preventDefault();
    scrollToTarget(hashTarget($(this).attr('href')), -160, 1000);
  });

  /* Whitepaper CTAs scroll to the form only when the target exists locally. */
  $('.single-whitepaper .sec-3-download a, .single-whitepaper .wp-block-button .wp-block-button__link').on('click', function (e) {
    var $target = hashTarget($(this).attr('href'));
    if ($target.length) {
      e.preventDefault();
      scrollToTarget($target, -100, 500);
    }
  });

  /**
   * Anchor scroll that also writes the hash back to the URL.
   *
   * @param {string} selector
   * @param {number} offset
   */
  function bindHashScroll(selector, offset) {
    $(selector).on('click', function () {
      var target = this.hash;
      scrollToTarget($(target), offset, 600, {
        stop: true,
        easing: 'swing',
        complete: function () {
          window.location.hash = target;
        }
      });
    });
  }

  bindHashScroll('.single-case-study a[href^="#"]', -100);
  bindHashScroll('.envision-page .envision-on-demand-btn-inner a[href^="#"]', -125);

  /* Clone the TOC into the article body so mobile can render it inline. */
  if ($('.single-page-new .left-content').length) {
    $('.single-page-new .left-content').clone().insertAfter($('.single-page-new .entry-content').children().first());
  }

  /* Gartner report tab views. */
  $('.garnter-conversational-report .sec-4-tabview .tabview-column a').on('click', function (e) {
    e.preventDefault();
    if (!$(this).closest('p').hasClass('active')) {
      $('.tabview-column p').removeClass('active');
      $(this).closest('p').addClass('active');
      $('.sec-4-tabview .tab-section').hide();
      $($(this).attr('href')).show();
    }
  });

  $('.garnter-conversational-report .sec-5-tabview .tabview-column a').on('click', function (e) {
    e.preventDefault();
    if (!$(this).closest('.wp-block-column').hasClass('active')) {
      $('.tabview-column .wp-block-column').removeClass('active');
      $(this).closest('.wp-block-column').addClass('active');
      $('.sec-5-tabview .tab-section').hide();
      $($(this).attr('href')).show();
    }
  });

  /* Total CX automation tabs. */
  $('.sec-2 .total-cx-automation-tab-nav li').on('click', function (e) {
    e.preventDefault();
    var $tab = $(this);
    if ($tab.hasClass('active')) {
      return;
    }

    var target = $tab.text().toLowerCase();
    $('.sec-2 .total-cx-automation-tab-nav li a').removeClass('active');
    $('.sec-2 .total-cx-automation-tab-nav li').removeClass('active');
    $('.sec-2 .total-cx-tab-g').removeClass('active').hide();
    $tab.addClass('active').closest('li').addClass('active');
    $tab
      .closest('.sec-2')
      .find('#total-cx-tab-' + target)
      .slideDown('slow');
  });

  /* Podcast episode list "load more". */
  if ($('.podcast-load-more').length) {
    $('.podcast-load-more').closest('.wp-block-buttons').nextAll().hide();
  }

  $('.podcast-load-more').on('click', function (e) {
    e.preventDefault();
    $(this).closest('.wp-block-buttons').nextAll().show();
    $(this).closest('.wp-block-buttons').hide();
  });

  /* Copy-to-clipboard share link. */
  $('body').on('click', '.copy-share', function (e) {
    e.preventDefault();

    var text = $(this).attr('href');
    var dummy = document.createElement('input');

    document.body.appendChild(dummy);
    dummy.value = text;
    dummy.select();
    document.execCommand('copy');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    document.body.removeChild(dummy);

    var $message = $(this).closest('.share-menu').find('.copiedmessage');
    $message.fadeIn();
    setTimeout(function () {
      $message.fadeOut();
    }, 2000);
  });

  /* Thank-you page download attribute. */
  if ($('.single-thank-you').length && $('.wp-block-buttons').hasClass('download')) {
    $('.thank-you-page a').attr('download', '');
  }

  /* ===================================================================
   * 12. MODALS & POPUPS
   * =================================================================== */

  /* --- HubSpot modal -------------------------------------------------- */

  /* Deep link: ?open_popup=true&id=<modal-id>&show=desktop|mobile|all */
  var popupParams = new URLSearchParams(window.location.search);
  if (popupParams.get('open_popup') === 'true') {
    var popupTarget = '#' + popupParams.get('id');
    var popupShow = popupParams.get('show');
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

    if (popupShow === 'all' || (popupShow === 'desktop' && viewportWidth >= 1024) || (popupShow === 'mobile' && viewportWidth < 1024)) {
      $(popupTarget).fadeIn(300);
    }
  }

  /**
   * Opens the page's demo modal on load, for pages flagged with the
   * "Auto-open Demo Popup" field (see the body_class filter in
   * inc/style-handling.php).
   *
   * WHY THIS WAITS
   * --------------
   * Revealing the modal immediately looked broken: HubSpot injects `.hbspt-form`
   * into `.yellow-hubspot-loader` a beat after page load, so the modal faded in
   * near-empty at its collapsed height and then visibly jumped as the fields
   * landed and `.modal-wrap` re-centred.
   *
   * So the reveal is deferred until the form markup actually exists, then held
   * one more short beat for HubSpot to finish styling it. Whichever of these
   * happens first wins:
   *
   *   1. HubSpot's `onFormReady` postMessage
   *   2. a MutationObserver seeing a `<form>` appear inside the modal
   *   3. READY_TIMEOUT elapsing — the safety net, so a blocked or failed
   *      HubSpot load still shows the modal rather than swallowing it
   *
   * The modal closes via `.modal--close` or a click outside `.modal-wrap`.
   * There is deliberately no Escape binding: none of the other open paths have
   * one, and adding it only here would make the modal behave inconsistently.
   *
   * Skipped when `?open_popup=true` is present so a deep link cannot race this
   * and open two modals.
   */
  function openDemoPopupWhenReady($modal) {
    var SETTLE_DELAY = 150; /* ms for HubSpot to finish laying the form out */
    var READY_TIMEOUT = 5000; /* ms before we give up waiting and open anyway */

    var opened = false;
    var observer = null;
    var timeoutId = null;

    function hasRenderedForm() {
      return $modal.find('.hbspt-form form').length > 0;
    }

    function open() {
      if (opened) {
        return;
      }
      opened = true;

      if (observer) {
        observer.disconnect();
      }
      clearTimeout(timeoutId);
      window.removeEventListener('message', onHubSpotMessage);

      $modal.fadeIn(300);
    }

    /** Reveal after a short settle so the form is laid out before it is seen. */
    function openWhenSettled() {
      if (!opened) {
        setTimeout(open, SETTLE_DELAY);
      }
    }

    function onHubSpotMessage(event) {
      var data = event.data;
      if (data && data.type === 'hsFormCallback' && data.eventName === 'onFormReady') {
        openWhenSettled();
      }
    }

    /* Already rendered (cached form, or we ran late) — no need to wait. */
    if (hasRenderedForm()) {
      openWhenSettled();
      return;
    }

    window.addEventListener('message', onHubSpotMessage);

    if (window.MutationObserver) {
      observer = new MutationObserver(function () {
        if (hasRenderedForm()) {
          openWhenSettled();
        }
      });
      observer.observe($modal[0], { childList: true, subtree: true });
    }

    timeoutId = setTimeout(open, READY_TIMEOUT);
  }

  if ($('body').hasClass('auto-open-demo-popup') && popupParams.get('open_popup') !== 'true') {
    var $autoModal = $('.hubspot-modal').first();
    if ($autoModal.length) {
      openDemoPopupWhenReady($autoModal);
    }
  }

  /* Both shapes exist in the markup: a wrapper with a child link, and a bare link. */
  $('.hubspot-button-click a, a.hubspot-button-click').on('click', function (e) {
    e.preventDefault();
    $($(this).attr('href')).fadeIn(300);
  });

  /* Click-outside closes the modal. No `.length` guard: the original had none,
     and adding one would change behaviour on pages with no `.modal-wrap`. */
  $(document).on('mouseup', function (e) {
    var $container = $('.modal-wrap');
    if (!$container.is(e.target) && $container.has(e.target).length === 0) {
      $('.hubspot-modal').fadeOut();
    }
  });

  $('.modal--close').on('click', function (e) {
    e.preventDefault();
    $('.hubspot-modal').fadeOut();
  });

  /* Auto-open the NLP demo modal from ?request-demo=<product>. */
  if ($('.dynamic-nlp').length && new URLSearchParams(window.location.search).get('request-demo')) {
    $('.dynamic-npl-request-demo a').first().trigger('click');
  }

  /* Mobile sticky form toggle. */
  $('.mobile-form-button-sticky a').on('click', function (e) {
    e.preventDefault();
    var $form = $('.hbspt-form');
    if ($form.is(':visible')) {
      $form.slideUp();
      $(this).removeClass('active');
    } else {
      $form.slideDown();
      $(this).addClass('active');
    }
  });

  /* --- Homepage agentic chat ----------------------------------------- */

  $('#chat-ai-homepage').css('display', 'flex').hide();

  $('#get-answers').on('click', function (e) {
    e.preventDefault();
    $('#chat-ai-homepage').fadeIn();
  });

  $('#chat-ai-homepage').on('click', function (e) {
    if (!$(e.target).closest('#agenticSDK').length) {
      $(this).fadeOut();
    }
  });

  $(document).on('keydown', function (e) {
    if (e.key === 'Escape' && $('#chat-ai-homepage').is(':visible')) {
      $('#chat-ai-homepage').fadeOut();
    }
  });

  /* --- Exit intent ---------------------------------------------------- */

  $('#exit-popup-btn').on('click', function (e) {
    e.preventDefault();
    $('#exit-intent-modal').fadeOut();
  });

  $('.exit-popup-close-button').on('click', function () {
    $('#exit-intent-modal').fadeOut();
  });

  $('.exit-popup-modal-body .button').on('click', function () {
    $('#exit-intent-modal').hide();
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('.exit-popup-modal-body').length) {
      $('#exit-intent-modal').fadeOut();
    }
  });

  /* --- Report form as a modal (Forrester page) -------------------------
     The exit-intent "Access Report" CTA promotes the report form that is
     already on the page into a centred modal.

     The form node is never detached or cloned — only the column that holds
     it gets a class. Moving it would re-mount the rendered HubSpot form and
     embedding a second copy would bill a duplicate form view, so the DOM
     stays exactly where it is and only the styling changes.
     Styles live in scss/critical/v2/forrester.scss. */

  (function () {
    var $page = $('body.forrester');
    var $form = $('#report-form');
    if (!$page.length || !$form.length) {
      return;
    }

    var $column = $form.closest('.wp-block-column');
    if (!$column.length) {
      return;
    }

    var $backdrop = null;
    var $close = null;

    function isOpen() {
      return $column.hasClass('report-form-popup');
    }

    function closeReportForm() {
      if (!isOpen()) {
        return;
      }
      $column.removeClass('report-form-popup');
      $page.removeClass('report-form-open');
      if ($close) {
        $close.remove();
        $close = null;
      }
      if ($backdrop) {
        $backdrop.remove();
        $backdrop = null;
      }
    }

    function openReportForm() {
      if (isOpen()) {
        return;
      }
      $('#exit-intent-modal').hide();
      $backdrop = $('<div class="report-form-backdrop"></div>').appendTo($page);
      $close = $('<a href="#" class="report-form-close" aria-label="Close">&times;</a>').prependTo($column);
      $column.addClass('report-form-popup');
      $page.addClass('report-form-open');
    }

    $(document).on('click', '.open-report-form', function (e) {
      e.preventDefault();
      openReportForm();
    });

    $(document).on('click', '.report-form-close, .report-form-backdrop', function (e) {
      e.preventDefault();
      closeReportForm();
    });

    $(document).on('keydown', function (e) {
      if (e.key === 'Escape') {
        closeReportForm();
      }
    });
  })();

  /* --- Schedule form modal -------------------------------------------- */

  $('body').on('click', '.schedule-form-modal', function (e) {
    var $container = $('.schedule-form-div');
    if (!$container.is(e.target) && $container.has(e.target).length === 0) {
      $('.schedule-form-modal').fadeOut();
    }
  });

  $('.close-modal').on('click', function (e) {
    e.preventDefault();
    $('.schedule-form-modal').fadeOut();
  });

  /* --- Partner-with-us modal ------------------------------------------ */

  $('.partner-with-us .modal-content').hide();

  $('.partner-with-us .view-popup').on('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $('.modal-content').css('display', 'flex').fadeIn();
  });

  /* As above, kept unguarded to match the original exactly. Note this fades out
     ALL `.modal-content` on any mouseup outside the partner modal, including on
     pages that have no partner block — pre-existing behaviour, not a new bug. */
  $(document).on('mouseup', function (e) {
    var $container = $('.partner-with-us .modal-content .wp-block-group__inner-container');
    if (!$container.is(e.target) && $container.has(e.target).length === 0) {
      $('.modal-content').fadeOut();
    }
  });

  $('.partner-with-us .modal-content').on('click', function (e) {
    e.stopPropagation();
  });

  /* --- Misc sliders ---------------------------------------------------- */

  if ($('.swss-slider').length) {
    var $swssPager = $('.swss-slider').parents('.swss-flex').find('.pager');
    $('.swss-slider').slick({
      infinite: true,
      slidesToShow: 1,
      slidesToScroll: 1,
      dots: false,
      prevArrow: $swssPager.find('.prev'),
      nextArrow: $swssPager.find('.next')
    });
  }

  /* ===================================================================
   * 13. HUBSPOT FORM ENHANCEMENTS
   * =================================================================== */

  /**
   * Maps a dialling code to a country name for HubSpot's `country_updated`.
   *
   * Two dialling codes are ambiguous (+1 US/CA, +7 RU/KZ), so the ISO code from
   * the dropdown wins when it names one of the minority countries.
   *
   * @param {string} countryCode  Dialling code, with or without a leading "+".
   * @param {string} isoCode      ISO country code from the extension dropdown.
   * @return {string} Country name, or the formatted dialling code if unmapped.
   */
  function getCountryNameFromCode(countryCode, isoCode) {
    if (isoCode === 'CA') {
      return 'Canada';
    }
    if (isoCode === 'KZ') {
      return 'Kazakhstan';
    }

    var countryMapping = {
      '+376': 'Andorra',
      '+971': 'United Arab Emirates',
      '+93': 'Afghanistan',
      '+1268': 'Antigua and Barbuda',
      '+1264': 'Anguilla',
      '+355': 'Albania',
      '+374': 'Armenia',
      '+244': 'Angola',
      '+54': 'Argentina',
      '+43': 'Austria',
      '+61': 'Australia',
      '+297': 'Aruba',
      '+35818': 'Åland Islands',
      '+994': 'Azerbaijan',
      '+387': 'Bosnia and Herzegovina',
      '+1246': 'Barbados',
      '+880': 'Bangladesh',
      '+32': 'Belgium',
      '+226': 'Burkina Faso',
      '+359': 'Bulgaria',
      '+973': 'Bahrain',
      '+257': 'Burundi',
      '+229': 'Benin',
      '+590': 'Saint Barthélemy',
      '+1441': 'Bermuda',
      '+673': 'Brunei Darussalam',
      '+591': 'Bolivia, Plurinational State of',
      '+599': 'Bonaire, Sint Eustatius, and Saba',
      '+55': 'Brazil',
      '+1242': 'Bahamas',
      '+975': 'Bhutan',
      '+267': 'Botswana',
      '+375': 'Belarus',
      '+501': 'Belize',
      '+1': 'United States', // Note: This could also be Canada
      '+243': 'Congo, Democratic Republic of the',
      '+236': 'Central African Republic',
      '+242': 'Congo',
      '+41': 'Switzerland',
      '+225': "Côte d'Ivoire",
      '+682': 'Cook Islands',
      '+56': 'Chile',
      '+237': 'Cameroon',
      '+86': 'China',
      '+57': 'Colombia',
      '+506': 'Costa Rica',
      '+53': 'Cuba',
      '+238': 'Cape Verde',
      '+357': 'Cyprus',
      '+420': 'Czech Republic',
      '+49': 'Germany',
      '+253': 'Djibouti',
      '+45': 'Denmark',
      '+1767': 'Dominica',
      '+1809': 'Dominican Republic',
      '+213': 'Algeria',
      '+593': 'Ecuador',
      '+372': 'Estonia',
      '+20': 'Egypt',
      '+212': 'Morocco',
      '+291': 'Eritrea',
      '+34': 'Spain',
      '+251': 'Ethiopia',
      '+358': 'Finland',
      '+679': 'Fiji',
      '+500': 'Falkland Islands (Malvinas)',
      '+298': 'Faroe Islands',
      '+33': 'France',
      '+241': 'Gabon',
      '+44': 'United Kingdom',
      '+1473': 'Grenada',
      '+995': 'Georgia',
      '+594': 'French Guiana',
      '+233': 'Ghana',
      '+350': 'Gibraltar',
      '+299': 'Greenland',
      '+220': 'Gambia',
      '+224': 'Guinea',
      '+30': 'Greece',
      '+502': 'Guatemala',
      '+245': 'Guinea-Bissau',
      '+592': 'Guyana',
      '+852': 'Hong Kong SAR China',
      '+504': 'Honduras',
      '+385': 'Croatia',
      '+509': 'Haiti',
      '+36': 'Hungary',
      '+62': 'Indonesia',
      '+353': 'Ireland',
      '+972': 'Israel',
      '+91': 'India',
      '+964': 'Iraq',
      '+98': 'Iran, Islamic Republic of',
      '+354': 'Iceland',
      '+39': 'Italy',
      '+1876': 'Jamaica',
      '+962': 'Jordan',
      '+81': 'Japan',
      '+254': 'Kenya',
      '+996': 'Kyrgyzstan',
      '+855': 'Cambodia',
      '+686': 'Kiribati',
      '+269': 'Comoros',
      '+1869': 'Saint Kitts and Nevis',
      '+850': "Korea, Democratic People's Republic",
      '+82': 'Korea, Republic of',
      '+965': 'Kuwait',
      '+1345': 'Cayman Islands',
      '+7': 'Russian Federation', // Note: This could also be Kazakhstan
      '+856': "Lao People's Democratic Republic",
      '+961': 'Lebanon',
      '+1758': 'Saint Lucia',
      '+423': 'Liechtenstein',
      '+94': 'Sri Lanka',
      '+231': 'Liberia',
      '+266': 'Lesotho',
      '+370': 'Lithuania',
      '+352': 'Luxembourg',
      '+371': 'Latvia',
      '+218': 'Libyan Arab Jamahiriya',
      '+377': 'Monaco',
      '+373': 'Moldova, Republic of',
      '+382': 'Montenegro',
      '+261': 'Madagascar',
      '+389': 'Macedonia, former Yugoslav Republic of',
      '+223': 'Mali',
      '+95': 'Myanmar',
      '+976': 'Mongolia',
      '+853': 'Macao',
      '+596': 'Martinique',
      '+222': 'Mauritania',
      '+1664': 'Montserrat',
      '+356': 'Malta',
      '+230': 'Mauritius',
      '+960': 'Maldives',
      '+265': 'Malawi',
      '+52': 'Mexico',
      '+60': 'Malaysia',
      '+258': 'Mozambique',
      '+264': 'Namibia',
      '+687': 'New Caledonia',
      '+227': 'Niger',
      '+234': 'Nigeria',
      '+505': 'Nicaragua',
      '+31': 'Netherlands',
      '+47': 'Norway',
      '+977': 'Nepal',
      '+674': 'Nauru',
      '+683': 'Niue',
      '+64': 'New Zealand',
      '+968': 'Oman',
      '+507': 'Panama',
      '+51': 'Peru',
      '+689': 'French Polynesia',
      '+675': 'Papua New Guinea',
      '+63': 'Philippines',
      '+92': 'Pakistan',
      '+48': 'Poland',
      '+508': 'Saint Pierre and Miquelon',
      '+970': 'Palestinian Territory, Occupied',
      '+351': 'Portugal',
      '+595': 'Paraguay',
      '+974': 'Qatar',
      '+262': 'Réunion',
      '+40': 'Romania',
      '+381': 'Serbia',
      '+250': 'Rwanda',
      '+966': 'Saudi Arabia',
      '+677': 'Solomon Islands',
      '+248': 'Seychelles',
      '+249': 'Sudan',
      '+46': 'Sweden',
      '+65': 'Singapore',
      '+290': 'Saint Helena, Ascension, Tristan da Cunha',
      '+386': 'Slovenia',
      '+421': 'Slovakia',
      '+232': 'Sierra Leone',
      '+378': 'San Marino',
      '+221': 'Senegal',
      '+252': 'Somalia',
      '+597': 'Suriname',
      '+211': 'South Sudan',
      '+239': 'Sao Tome and Principe',
      '+503': 'El Salvador',
      '+1721': 'Sint Maarten (Dutch part)',
      '+963': 'Syrian Arab Republic',
      '+268': 'Swaziland',
      '+1649': 'Turks and Caicos Islands',
      '+235': 'Chad',
      '+228': 'Togo',
      '+66': 'Thailand',
      '+992': 'Tajikistan',
      '+690': 'Tokelau',
      '+670': 'Timor-Leste',
      '+993': 'Turkmenistan',
      '+216': 'Tunisia',
      '+676': 'Tonga',
      '+90': 'Turkey',
      '+1868': 'Trinidad and Tobago',
      '+688': 'Tuvalu',
      '+886': 'Chinese Taipei',
      '+255': 'Tanzania, United Republic of',
      '+380': 'Ukraine',
      '+256': 'Uganda',
      '+598': 'Uruguay',
      '+998': 'Uzbekistan',
      '+39': 'Holy See (Vatican City State)',
      '+1784': 'Saint Vincent and the Grenadines',
      '+58': 'Venezuela, Bolivarian Republic of',
      '+1284': 'Virgin Islands, British',
      '+84': 'Viet Nam',
      '+678': 'Vanuatu',
      '+681': 'Wallis and Futuna',
      '+685': 'Samoa',
      '+967': 'Yemen',
      '+27': 'South Africa',
      '+260': 'Zambia',
      '+263': 'Zimbabwe'
    };

    var cleanCode = (countryCode || '').toString().trim();
    var formattedCode = cleanCode.charAt(0) === '+' ? cleanCode : '+' + cleanCode;

    return countryMapping[formattedCode] || formattedCode;
  }

  /**
   * Mirrors the phone dialling code into HubSpot's hidden `country_updated`
   * field, handling both <input> and <select> renderings of it.
   *
   * @return {boolean} True once the fields were found and wired.
   */
  function setupCountryField() {
    var $countryInput = $('input[id^="phone-"]');
    var $countryDropdown = $('select[id^="phone_ext-"]');
    var $hiddenCountryField = $('input[name="country_updated"], select[name="country_updated"]');

    if (!$countryInput.length || !$hiddenCountryField.length) {
      return false;
    }

    /**
     * @param {boolean} triggerChange Fire a change event after setting.
     */
    function applyCountry(triggerChange) {
      var countryName = getCountryNameFromCode($countryInput.val(), $countryDropdown.val());

      if ($hiddenCountryField.is('select')) {
        var $option = $hiddenCountryField.find('option[value="' + countryName + '"]');
        if (!$option.length) {
          console.warn('No matching option found for country: ' + countryName);
          return;
        }
        $hiddenCountryField.val($option.val());
      } else {
        $hiddenCountryField.val(countryName);
      }

      if (triggerChange) {
        $hiddenCountryField.trigger('change');
      }
    }

    applyCountry(false);

    /* HubSpot re-renders the extension dropdown asynchronously, hence the delay. */
    $countryDropdown.off('change').on('change', function () {
      setTimeout(function () {
        applyCountry(true);
      }, 2000);
    });

    return true;
  }

  if ($('.hbspt-form').length && !setupCountryField()) {
    /* The form is embedded by HubSpot after page load, so poll briefly for it. */
    var countryAttempts = 0;
    var MAX_COUNTRY_ATTEMPTS = 5;

    var countryFieldPoll = setInterval(function () {
      countryAttempts++;

      if (setupCountryField() || countryAttempts >= MAX_COUNTRY_ATTEMPTS) {
        clearInterval(countryFieldPoll);
        if (countryAttempts >= MAX_COUNTRY_ATTEMPTS) {
          console.warn('Could not find country dropdown after multiple attempts');
        }
      }
    }, 2000);
  }
});
