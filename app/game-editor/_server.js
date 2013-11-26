define(['api/server/connection'], function (cnn) {

  //input: {}
  //output: [{id, tiles:[{id, x, y, angle}], paths:[{id, startTile, endTile, cw, nWords, minCurve, maxCurve}], level}, {..}]
  cnn.addEmission("manager:boards");
  
});