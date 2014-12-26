define(['./connection', './events'], function (cnn, events) {

  for (var i = 0; i < events.emission.length; i++) {
    cnn.addEmission(events.emission[i]);
  }

  for (var event in events.custom) {
    cnn.addEvent(event, events.custom[event]);
  }
  
  events.init(cnn.socket);
});