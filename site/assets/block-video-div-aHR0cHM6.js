jQuery(document).ready(function ($) {
  $('.yellow-video-div .thumbnail-img').on('click', function (e) {
    e.preventDefault();
    $(this).hide();
    $(this).closest('.yellow-video-div').find('.play').hide();
    $(this).closest('.yellow-video-div').find('video').get(0).play();
  });
});
