jQuery(document).ready(function ($) {
  if (window.innerWidth >= 1024) {
    $('.yellow-card-rotation').each(function () {
      var $slider = $(this);
      var $wrapper = $slider.find('.card-slider-wrapper');
      var $cards = $slider.find('.card-container');
      var $prevArrow = $slider.find('.pager .prev');
      var $nextArrow = $slider.find('.pager .next');
      var totalCards = $cards.length;
      var currentIndex = 0;
      var isAutoSliding = true;
      var autoSlideInterval;
      var isAnimating = false;

      if (totalCards <= 1) return;

      // Check if device is mobile
      function isMobile() {
        return window.innerWidth <= 768;
      }

      // Define layered positions for each card (desktop)
      var cardPositions = {
        0: { x: 0, y: 0, scale: 1, zIndex: 10 }, // Front card
        1: { x: 252, y: -90, scale: 0.795, zIndex: 2 }, // Right behind
        2: { x: 158, y: -178, scale: 0.65, zIndex: 1 }, // Far right
        3: { x: -158, y: -178, scale: 0.65, zIndex: 1 }, // Far left
        4: { x: -252, y: -90, scale: 0.795, zIndex: 2 } // Left behind
      };

      // Define mobile positions (no x/y transforms, only scale and z-index)
      var mobileCardPositions = {
        0: { x: 0, y: 0, scale: 1, zIndex: 10 }, // Front card
        1: { x: 40, y: 0, scale: 0.9, zIndex: 4 }, // Behind
        2: { x: 20, y: 0, scale: 0.95, zIndex: 3 }, // Further behind
        3: { x: -20, y: 0, scale: 0.95, zIndex: 2 }, // Further behind
        4: { x: -40, y: 0, scale: 0.9, zIndex: 1 } // Behind
      };

      // Update card positions based on current active index
      function updateCardPositions() {
        $cards.removeClass('active');
        var positions = isMobile() ? mobileCardPositions : cardPositions;

        $cards.each(function (index) {
          var $card = $(this);
          var relativePosition = (index - currentIndex + totalCards) % totalCards;
          var position = positions[relativePosition] || positions[4];

          if (relativePosition === 0) {
            $card.addClass('active');
          }

          // Apply different transforms based on device type
          if (isMobile()) {
            // For mobile: only use scale and z-index, no x/y translation
            $card.css({
              transform: `translateX(${position.x}px) translateY(${position.y}px) scale(${position.scale})`,
              'z-index': position.zIndex,
              opacity: position.opacity || 1,
              transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
          } else {
            // For desktop: use full transform including x/y translation
            $card.css({
              transform: `translateX(${position.x}px) translateY(${position.y}px) scale(${position.scale})`,
              'z-index': position.zIndex,
              opacity: position.opacity || 1,
              transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
          }
        });
      }

      // Move to next slide
      function nextSlide() {
        if (isAnimating) return;

        isAnimating = true;
        currentIndex = (currentIndex + 1) % totalCards;
        updateCardPositions();

        setTimeout(function () {
          isAnimating = false;
        }, 800);
      }

      // Move to previous slide
      function previousSlide() {
        if (isAnimating) return;

        isAnimating = true;
        currentIndex = (currentIndex - 1 + totalCards) % totalCards;
        updateCardPositions();

        setTimeout(function () {
          isAnimating = false;
        }, 800);
      }

      // Go to specific slide
      function goToSlide(index) {
        if (isAnimating || index === currentIndex) return;

        isAnimating = true;
        currentIndex = index;
        updateCardPositions();

        setTimeout(function () {
          isAnimating = false;
        }, 800);

        // Reset auto slide
        resetAutoSlide();
      }

      // Auto slide functions
      function startAutoSlide() {
        stopAutoSlide();
        autoSlideInterval = setInterval(function () {
          if (isAutoSliding && !isAnimating) {
            nextSlide();
          }
        }, 5000);
      }

      function stopAutoSlide() {
        if (autoSlideInterval) {
          clearInterval(autoSlideInterval);
          autoSlideInterval = null;
        }
      }

      function resetAutoSlide() {
        stopAutoSlide();
        setTimeout(function () {
          if (isAutoSliding) {
            startAutoSlide();
          }
        }, 3000);
      }

      // Event handlers
      $cards.on('click', function (e) {
        var clickedIndex = parseInt($(this).data('slide'));

        // If this is the active card, allow the link to work normally
        if ($(this).hasClass('active')) {
          // Let the default link behavior happen (opening new page)
          return true;
        } else {
          // If it's not the active card, prevent link and just go to that slide
          e.preventDefault();
          goToSlide(clickedIndex);
        }
      });

      // Arrow navigation event handlers
      $prevArrow.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        previousSlide();
        resetAutoSlide();
      });

      $nextArrow.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        nextSlide();
        resetAutoSlide();
      });

      // Touch events for mobile
      var touchStartX = 0;
      var touchStartY = 0;
      var touchEndX = 0;
      var touchEndY = 0;
      var minSwipeDistance = 50;

      $slider.on('touchstart', function (e) {
        touchStartX = e.originalEvent.touches[0].clientX;
        touchStartY = e.originalEvent.touches[0].clientY;
        isAutoSliding = false;
      });

      $slider.on('touchmove', function (e) {
        e.preventDefault(); // Prevent scrolling
      });

      $slider.on('touchend', function (e) {
        touchEndX = e.originalEvent.changedTouches[0].clientX;
        touchEndY = e.originalEvent.changedTouches[0].clientY;

        var deltaX = touchStartX - touchEndX;
        var deltaY = touchStartY - touchEndY;

        // Only process horizontal swipes
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
          if (deltaX > 0) {
            // Swipe left - next slide
            nextSlide();
          } else {
            // Swipe right - previous slide
            previousSlide();
          }
        }

        // Resume auto sliding after a delay
        setTimeout(function () {
          isAutoSliding = true;
        }, 2000);
      });

      // Keyboard navigation
      $(document).on('keydown', function (e) {
        if (!$slider.is(':visible')) return;

        switch (e.keyCode) {
          case 37: // Left arrow
            e.preventDefault();
            previousSlide();
            break;
          case 39: // Right arrow
            e.preventDefault();
            nextSlide();
            break;
          case 32: // Spacebar - pause/play
            e.preventDefault();
            if (isAutoSliding) {
              isAutoSliding = false;
              stopAutoSlide();
            } else {
              isAutoSliding = true;
              startAutoSlide();
            }
            break;
        }
      });

      // Page visibility handling
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          stopAutoSlide();
        } else if (isAutoSliding) {
          startAutoSlide();
        }
      });

      // Window focus/blur
      $(window)
        .on('focus', function () {
          if (isAutoSliding) startAutoSlide();
        })
        .on('blur', function () {
          stopAutoSlide();
        });

      // Responsive adjustments - now updates positions when switching between mobile/desktop
      $(window).on(
        'resize',
        debounce(function () {
          updateCardPositions();
        }, 250)
      );

      function debounce(func, wait) {
        var timeout;
        return function executedFunction() {
          var later = function () {
            clearTimeout(timeout);
            func.apply(this, arguments);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      }

      // Initialize
      updateCardPositions();
      startAutoSlide();

      // Store controller methods
      $slider.data('stackedCarousel', {
        next: nextSlide,
        previous: previousSlide,
        goTo: goToSlide,
        pause: function () {
          isAutoSliding = false;
          stopAutoSlide();
        },
        play: function () {
          isAutoSliding = true;
          startAutoSlide();
        },
        getCurrentIndex: function () {
          return currentIndex;
        },
        getTotalCards: function () {
          return totalCards;
        }
      });

      console.log('Stacked carousel initialized with ' + totalCards + ' cards');
    });

    // Global control function
    window.controlStackedCarousel = function (sliderId, action, value) {
      var $slider = $('#' + sliderId);
      var carousel = $slider.data('stackedCarousel');

      if (!carousel) {
        console.warn('Carousel not found for ID:', sliderId);
        return false;
      }

      switch (action) {
        case 'next':
          carousel.next();
          break;
        case 'previous':
          carousel.previous();
          break;
        case 'goTo':
          if (typeof value === 'number' && value >= 0 && value < carousel.getTotalCards()) {
            carousel.goTo(value);
          }
          break;
        case 'pause':
          carousel.pause();
          break;
        case 'play':
          carousel.play();
          break;
        case 'current':
          return carousel.getCurrentIndex();
        case 'total':
          return carousel.getTotalCards();
      }

      return true;
    };
  } else {
    // $('.yellow-card-rotation .card-slider-wrapper').each(function () {
    //   var _this = $(this);
    //   var _pager = $(this).parents('.yellow-card-rotation').find('.pager');
    //   _this.slick({
    //     dots: false,
    //     arrows: true,
    //     infinite: true,
    //     centerMode: true,
    //     variableWidth: true,
    //     prevArrow: $(_pager).find('.prev'),
    //     nextArrow: $(_pager).find('.next')
    //   });
    // });
  }
});
