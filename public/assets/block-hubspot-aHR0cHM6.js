jQuery(document).ready(function ($) {
    //var height = '390px';
    $(document).keydown(function (event) {
        if (event.keyCode == 27) {
            if ($('#prospect-form').is(":visible")) {
                $('#prospect-form').hide();
            }
        }
    });
});
