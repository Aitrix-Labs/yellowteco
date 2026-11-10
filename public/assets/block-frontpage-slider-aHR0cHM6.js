(function ($) {
  $(document).ready(function () {
    $(".yellow-frontpage-slider .frontpage-slider").each(function () {
      var _this = $(this);
      var _pager = $(this).parents(".yellow-frontpage-slider").find(".pager");
      var slickJson = {
        dots: false,
        arrows: true,
        infinite: false,
        slidesToShow: 1,
        slidesToScroll: 1,
        adaptiveHeight: true,
        prevArrow: $(_pager).find(".prev"),
        nextArrow: $(_pager).find(".next"),
      };
      if ($("body").hasClass("rtl")) {
        slickJson.rtl = true;
      }
      _this.slick(slickJson);
    });

    $("#get-answers").on("click", function (e) {
      e.preventDefault();
      
    });
  });
})(jQuery);
