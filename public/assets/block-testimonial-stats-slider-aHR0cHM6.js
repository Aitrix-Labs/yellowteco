(function ($) {
  $(document).ready(function () {
    $(".yellow-testimonial-stats-slider").each(function () {
      var _this = $(this);

      // slidesToShow is driven by an optional class on the block wrapper so a
      // single instance can show multiple cards without affecting other pages.
      // Default (no class) stays 1-up, preserving the original behaviour.
      var slidesToShow = 1;
      if (_this.hasClass("slides-3")) {
        slidesToShow = 3;
      } else if (_this.hasClass("slides-2")) {
        slidesToShow = 2;
      }

      var multi = slidesToShow > 1;
      var slickJson = {
        dots: multi,
        arrows: true,
        autoplay: !multi,
        infinite: true,
        slidesToShow: slidesToShow,
        // page by the number shown so the dots equal (cards / perPage)
        slidesToScroll: slidesToShow,
        pauseOnHover: multi,
      };
      if (multi) {
        slickJson.responsive = [
          { breakpoint: 768, settings: { slidesToShow: 1, slidesToScroll: 1 } },
        ];
      }
      if ($("body").hasClass("rtl")) {
        slickJson.rtl = true;
      }
      _this.slick(slickJson);
    });
  });
})(jQuery);
