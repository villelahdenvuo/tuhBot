var socket = io.connect('http://hilla.kapsi.fi:61747');

socket.on('feedback', function (f) {
  $('#nofeedback').slideUp(300);
  var text = f.timestamp + " <" + f.from + "> " + f.text;
  var div = $('<div>')
    .hide()
    .attr('id', f.id)
    .prependTo($('#feedbackcontainer'));

  $('<a>')
    .attr('href', 'api/comment/' + f.id)
    .attr('target', '_blank')
    .text(text)
    .appendTo(div);

  $('<button>delete</button>')
    .click(function (e) {
      e.preventDefault();
      deleteFeedback($(this).parent('div').attr('id'));
    }).appendTo(div);

    div.slideDown(300);

});

$(function () {
  $('#feedbackcontainer div button').click(function (e) {
    e.preventDefault();
    deleteFeedback($(this).parent('div').attr('id'));
  });
});

function deleteFeedback(id) {
  $.ajax('api/comment/' + id + '/delete').done(function() {
    $('#feedbackcontainer div#' + id).slideUp(300, function () {
      $(this).remove();
      if ($('#feedbackcontainer div').length <= 1) {
        $('#nofeedback').slideDown(300);
      }
    });
  });
}