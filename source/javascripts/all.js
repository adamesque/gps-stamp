//= require 'jquery'
//= require 'fastclick'
//= require 'pouchdb'
//= require_tree .

FastClick.attach(document.body);

var db = new PouchDB('stamp-gps');

var geo = navigator.geolocation;
var $body = $(document.body);
var isTracking = false;
var $toggleTrackingBtn = $("#toggle-tracking");
var watchId;
var $coords = $("#coords");
var currentPosition = null;
var $data = $("#data");
var $stampBtn = $("#stamp").hide();
var $stampsContainer = $("#stamps").hide();
var $stampList = $("#stamp-list");
var $clearAllBtn = $("#clear-all-stamps");
var userId = null;
var replicationUrl = $(document.body).data("replication-url");
var sync;

if (!replicationUrl) { throw new Error("Replication URL not set. Exiting."); };

//
// Event Listeners
//

$toggleTrackingBtn.click(function (e) {
  if (!isTracking) {
    startTracking();
    isTracking = true;
    $toggleTrackingBtn.text("Stop GPS Tracking");
  } else {
    stopTracking();
    isTracking = false;
    $stampBtn.hide();
    $toggleTrackingBtn.text("Start GPS Tracking");
  }

  $body.toggleClass("is-tracking");
});

$stampBtn.click(function (e) {
  stampPosition();
});

$clearAllBtn.click(function (e) {
  if (window.confirm("Clear All Stamps?")) {
    deleteStamps();
  }
});

//
// Func'uns
//

function init () {
  initUser();
  addUserIdToStamps()
    .then(trackDbChanges)
    .then(startReplication)
    .then(showStamps);
}

function trackDbChanges () {
  // Bind on db changes
  return db.info().then(function (info) {
    db.changes({
      since: info.update_seq,
      live: true
    }).on('change', showStamps);
  });
}

function startReplication () {
  sync = db.sync(replicationUrl, { live: true });
}

// Essentially a migration; adds userId field to all stamps if not present
function addUserIdToStamps () {
  if (!userId) { throw new Error("userId isn't set"); }

  return getStampsWithoutUserIds().then(function (res) {
    var rows = res.rows;
    if (rows.length === 0) {
      console.log("Skipping migration addUserIdToStamps (no stamps without userId)");
      return;
    }

    console.log("Running addUserIdToStamps migration for userId" + userId);
    var docs = rows.map(function (row) {
      var doc = row.doc;
      doc.user_id = userId;
      return doc;
    });

    return db.bulkDocs(docs).catch(logErr);
  });
}

function logErr (err) {
  console.error(err);
}

function initUser () {
  var id = localStorage.getItem('userId');
  if (!id) {
    id = PouchDB.utils.uuid();
    localStorage.setItem('userId', id);
  }

  userId = id;
}

function startTracking () {
  watchId = geo.watchPosition(updatePosition);
}

function stopTracking () {
  geo.clearWatch(watchId);
}

function updatePosition (pos) {
  $stampBtn.show();
  currentPosition = pos;
  var coords = pos.coords;
  $coords.text(coords.latitude + ", " + coords.longitude);
  $data.text(JSON.stringify(pos, null, "  "));
}

function stampPosition () {
  if (!currentPosition) { throw new Error("currentPosition isn't set"); }

  var stamp = {
    _id: currentPosition.timestamp.toString(),
    coords: JSON.parse(JSON.stringify(currentPosition.coords)),
    user_id: userId
  };

  db.put(stamp).catch(logErr);
}

function getStamps (opts) {
  var map = function (doc) {
    if (doc.user_id && doc.coords) {
      emit([doc.user_id, +doc._id]);
    }
  };

  opts = $.extend({}, { include_docs: true, startkey: [userId, {}], endkey: [userId], descending: true }, opts);

  return db.query(map, opts).catch(logErr);
}

function getStampsWithoutUserIds (opts) {
  var map = function (doc) {
    if (doc.coords && !doc.user_id) {
      emit(+doc._id);
    }
  }

  opts = $.extend({}, { include_docs: true }, opts);

  return db.query(map, opts).catch(logErr);
}

function showStamps () {
  getStamps().then(function (doc) {
    redrawStampsUI(doc.rows);
  });
}

function redrawStampsUI (rows) {
  console.log(rows);
  if (rows.length) {
    $stampList.html(rows.map(function (row) {
      var doc = row.doc;
      var timestamp = new Date(+doc._id).toLocaleString();
      var myUserId = doc.user_id;
      var lat = doc.coords.latitude;
      var lng = doc.coords.longitude;
      return "<li>" + lat + ",<br>" + lng + "<span title='" + myUserId + "' class='timestamp'>" + timestamp + "</span></li>";
    }).join("\n"));

    $stampsContainer.show();
  } else {
    $stampsContainer.hide();
  }
}

function deleteStamps () {
  getStamps().then(function (all) {
    var toDelete = all.rows.map(function (row) { row.doc._deleted = true; return row.doc; });
    return db.bulkDocs(toDelete);
  });
}

//
// Init
//
init();

