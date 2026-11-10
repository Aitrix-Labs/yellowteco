jQuery(document).ready(function ($) {
  if (window.innerWidth >= 1024) {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      $('.yellow-card-animation').each(function (index, element) {
        let cards = $(element).find('.card-block');
        let cardsWrapper = $(element).find('.cards-wrapper');
        let isMobile = window.matchMedia('(max-width: 1023px)').matches;

        if (cards.length > 1 && !isMobile) {
          let totalScrollLength = (cards.length - 1) * 800;

          let masterTimeline = gsap.timeline({
            scrollTrigger: {
              trigger: cardsWrapper[0],
              pin: true,
              start: 'top',
              end: `+=${totalScrollLength}`,
              scrub: 1,
              anticipatePin: 1
            }
          });

          cards.each(function (i, card) {
            let cardElement = $(card);

            if (i > 0) {
              let previousCard = cards.eq(i - 1);

              masterTimeline
                .to(
                  previousCard,
                  {
                    scale: 0.7,
                    opacity: 0,
                    ease: 'power1.out'
                  },
                  `cardAnimation-${i}`
                )
                .fromTo(
                  cardElement,
                  {
                    y: '100vh'
                  },
                  {
                    y: '0%',
                    ease: 'power1.inOut'
                  },
                  `cardAnimation-${i}`
                );
            }
          });
        }
      });
    }
  } else {
    // $('.yellow-card-animation .cards-wrapper').each(function () {
    //   var _this = $(this);
    //   var _pager = $(this).parents('.yellow-card-animation').find('.pager');
    //   _this.slick({
    //     dots: false,
    //     arrows: true,
    //     infinite: true,
    //     autoplay: true,
    //     slidesToShow: 1,
    //     slidesToScroll: 1,
    //     autoplaySpeed: 2000,
    //     prevArrow: $(_pager).find('.prev'),
    //     nextArrow: $(_pager).find('.next')
    //   });
    // });
  }
});
