var socket = io.connect('http://hilla.kapsi.fi:61747');

socket.on('feedback', function (data) {
  console.log(data);
  $('<li>').text(data.matches[1]).prependTo($('#feedback ul'));
});