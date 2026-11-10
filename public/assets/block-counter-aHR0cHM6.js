jQuery(document).ready(function ($) {
  var counted = 0;

  countAnimation();
  $(window).scroll(function () {
    countAnimation();
  });

  /*count animation */
  function countAnimation() {
    if ($('.counter-sec-inner').length > 0) {
      var oTop = $('.counter-sec-inner').offset().top - window.innerHeight;
      if (counted == 0 && $(window).scrollTop() > oTop) {
        $('.count').each(function () {
          var $this = $(this),
            countTo = $this.attr('data-count');
          $({
            countNum: $this.text()
          })
            .delay(500)
            .animate(
              {
                countNum: countTo
              },
              {
                duration: 2000,
                easing: 'swing',
                step: function () {
                  $this.text(Math.floor(this.countNum));
                },
                complete: function () {
                  $this.text(this.countNum);
                  //alert('finished');
                }
              }
            );
        });
        counted = 1;
      }
    }
  }
  /*end count animation */
});
