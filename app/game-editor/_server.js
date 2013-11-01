define(['api/server/connection'], function (cnn) {

  //input: {}
  //output: [{id, tiles:[{id, x, y, angle}], paths:[{id, startTile, endTile, cw, nWords, minCurve, maxCurve}], level}, {..}]
  cnn.addEmission("manager:getBoards");
  
  //input: {gameboard object}
  //output: {success: true|false}
  cnn.addEmission("manager:setBoard");
  /*
  for add:     id is not given? or null is set?
  for edit:    id is provided
  for remove:  id is provided along with destroy property-> {id:#, destroy: true}
  */
});