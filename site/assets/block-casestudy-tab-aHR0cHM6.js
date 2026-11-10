jQuery(document).ready(function ($) {
  $('.ctt__single').on('click', function (e) {
    e.preventDefault();
    if (!$(this).hasClass('active')) {
      var href = $(this).attr('href');
      $('.ctt__single').removeClass('active');
      $('.cc__single').removeClass('active');
      $(this).addClass('active');
      $(href).addClass('active');
    }
  });
});
