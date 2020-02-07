import 'core-js/features/array/for-each';
import 'core-js/features/array/filter';
import 'core-js/features/array/includes';
import CI360Viewer from './ci360.service';


function init() {
  const viewers = [];
  const view360Array = document.querySelectorAll('.cloudimage-360:not(.initialized)');

  [].slice.call(view360Array).forEach(container => { viewers.push(new CI360Viewer(container)); });

  window.CI360._viewers = viewers;
}

/**
 * Lazy-load allowance so a new viewer can be added to the scene
 * @param {Object} _newViewer The new viewer to load into the scene
 */
function loadNewViewer( _newViewer, _newInstructions ) {
  window.CI360._viewers.push( new CI360Viewer( _newViewer ) );
}

/**
 * Pauses the current viewer
 * @param {Number} index The viewer index
 */
function pauseViewer( index ) {
  if ( window.CI360._viewers[index] ) {
    window.CI360._viewers[index].isPlaying = false;
  }
}

/**
 * Plays the current viewer
 * @param {Number} index The viewer index
 */
function playViewer( index ) {
  if ( window.CI360._viewers[index] ) {
    window.CI360._viewers[index].isPlaying = true;
  }
}

function destroy() {
  if (isNoViewers()) return;

  window.CI360._viewers.forEach(viewer => { viewer.destroy(); });

  window.CI360._viewers = [];
}

function getActiveIndexByID(id) {
  if (isNoViewers()) return;

  let currentViewer = window.CI360._viewers.filter(viewer => viewer.id === id)[0];

  return currentViewer && (currentViewer.activeImage - 1);
}

function isNoViewers() {
  return !(window.CI360._viewers && window.CI360._viewers.length > 0);
}

window.CI360 = window.CI360 || {};
window.CI360.init = init;
window.CI360.destroy = destroy;
window.CI360.getActiveIndexByID = getActiveIndexByID;
window.CI360.loadNewViewer = loadNewViewer;
window.CI360.pauseViewer = pauseViewer;
window.CI360.playViewer = playViewer;

if (!window.CI360.notInitOnLoad) {
  init();
}