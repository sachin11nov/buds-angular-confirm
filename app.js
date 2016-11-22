(function () {
'use strict';

var app = angular.module('app',["buds-confirm"]);

app.controller("MyController", MyController);


function MyController($scope,budsConfirm,budsNotificationQueue) {
/* Controller instance acting as vm */
	var vm = this;
	vm.esdata = {};

	vm.testConfirm = function() {
      budsConfirm.confirm($scope, {
          title: "Please confirm",
          content: "Are you sure you want to perform this action?"
      })
      .then(function (yes) {
        console.log("Yes",yes);
				showToaster("Oh Yes, well done");
      })
      .catch(function (no) {
          console.log("No",no);
					showToaster("Oh No.");
      });
  };

	function showToaster(msg) {
      budsNotificationQueue.queueMessage({"timeout": 5000,"content": "<p style=\"padding: 40px;word-wrap: break-word;\">" + msg + "</p>"});
  }



}


})();
