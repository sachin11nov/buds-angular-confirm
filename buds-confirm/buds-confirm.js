(function () {
    "use strict";

    var app = angular.module("buds-confirm", []);

    app.directive("budsConfirmation",budsConfirmation);
    app.service("budsConfirm",budsConfirm);
    app.service("budsNotificationQueue", budsNotificationQueue);

    /*@ngInject*/
    function budsConfirm($compile, $q) {
        var service = this;
        service.confirm = function ($scope,config) {
            /*
            config.title
            config.content
            config.yes
            config.no
            config.cancel
            config.class
            */
            var template = "<buds-confirmation"
                + " cnf-title='" + config.title + "'"
                + " cnf-content='" + config.content + "'"
                + " cnf-show='shouldShow'"
                + " cnf-on-ok='onYes()'"
                + (config.class!=="" ? " class='" + config.class + "'" : "" )
                + (config.yes!=="" ? " cnf-on-yes='onYes()'" : "" )
                + (config.no!=="" ? " cnf-on-no='onNo()'" : "" )
                + (config.cancel!=="" ? " cnf-on-cancel='onCancel()'" : "" )
                + " cnf-on-yes='onYes()'"
                + " cnf-on-no='onNo()'"
                + " cnf-on-cancel='onCancel()'"
            + "><buds-confirmation>";

            var newScope = $scope.$new(true, $scope);
            var resolve, reject;

            newScope.onYes = function () {
                newScope.shouldShow = false;
                newScope.$destroy();
                resolve();
            };

            newScope.onCancel = function () {
                newScope.shouldShow = false;
                newScope.$destroy();
                // TODO: Need to reject with
                reject();
            };

            newScope.shouldShow = true;

            $compile(template)(newScope);

            return $q(function (_resolve, _reject) {
                resolve = _resolve;
                reject = _reject;
            });
        };
    }

    /*@ngInject*/
    function budsConfirmation(budsNotificationQueue) {
        return {
            restrict: "E",
            bindToController: true,
            controllerAs: "vm",

            scope: {
                title: "@cnfTitle",
                content: "@cnfContent",

                cnfOnOk: "&",
                cnfOkCaption: "@",

                cnfOnCancel: "&",
                cnfCancelCaption: "@",

                cnfShow: "=",
                cnfScreenPosition: "@",
            },

            templateUrl: function (element, attrs) {
                return attrs.olTemplateUrl || "buds-confirm/buds-confirm.tpl.html";
            },

            link: function ($scope, element) {

                $scope.$watch("vm.cnfShow", function (newVal) {

                    if (newVal) {
                        var html = element.html();

                        $scope.vm.notificationConfig = budsNotificationQueue.queuePrompt({
                            content: html,
                            scope: $scope
                        });
                    }

                });

            },

            controller: function () {

                var vm = this;

                vm.ok = function () {
                    if (typeof vm.cnfOnOk === "function") {
                        vm.cnfOnOk();
                    }
                    budsNotificationQueue.remove(vm.notificationConfig);
                    vm.cnfShow = false;
                };

                vm.cancel = function () {
                    if (typeof vm.cnfOnCancel === "function") {
                        vm.cnfOnCancel();
                    }
                    budsNotificationQueue.remove(vm.notificationConfig);
                    vm.cnfShow = false;
                };
            }
        };
    }

    /*@ngInject*/
    function budsNotificationQueue($q, $timeout, $compile, $rootScope) {

        /* Cache the reference to this pointer */
        var service = this;

        /* Local variables to maintain Service state */
        var queue = [];
        var currentlyShowingNotification = null;

        /* Takes dom node as input */
        service.queueMessage = function (config) {
            return addToQueue(config, false, queue.length);
        };

        service.queuePrompt = function (config) {

            // Don't accept new confirmation box if already showing
            if (!!currentlyShowingNotification && currentlyShowingNotification.immediate) {
                window.console.warn("Confirmation already in progress");
                return;
            }

            config.timeout = false;
            return addToQueue(config, true, 0);
        };

        service.remove = function (notificationObject) {
            removeNotification(notificationObject);
        };

        function addToQueue(config, isImmediate, atPosition) {
            var notificationObject, node;

            node = getDialogTemplate();

            notificationObject = {
                immediate: !!isImmediate,
                node: node,
                contentNode: config.content,
                $scope: config.scope || $rootScope.$new(),
                destroyScope: !config.scope,
                autoTimeout: config.timeout === true ? 7000 : config.timeout
            };

            /* Add to the queue for maintaining internal reference */
            queue.splice(atPosition, 0, notificationObject);

            showNextNotification();

            return notificationObject;
        }

        function showNextNotification() {

            var notificationObject, node;

            if (queue.length > 0) {

                if (currentlyShowingNotification === null) {
                    // Remove first notification from the queue and maintain it at currentlyShowingNotification
                    notificationObject = queue.shift();

                    node = notificationObject.node;

                    node.addClass("is-visible");
                    node.removeClass("hidden");
                    //node.find(".buds-notification-content").append(notificationObject.contentNode);
                    node.find(".buds-notification-content").html(notificationObject.contentNode);
                    node.find(".buds-notification-close").on("click", function () {
                        removeNotification(notificationObject);
                    });

                    /*Bind the mouseover event*/
                    node.bind("mouseover", function () {
                        stopTimer(notificationObject);
                    });

                    /*Bind the mouseleave event*/
                    node.bind("mouseleave", function () {
                        startTimer(notificationObject);
                    });


                    $compile(node)(notificationObject.$scope);

                    /* Add to the DOM */
                    $timeout(function () {
                        $(document.body).append(node);
                    }, 100);


                    /*if (!!notificationObject.autoTimeout) {
                        notificationObject.timer = $timeout(function () {
                            removeNotification(notificationObject);
                        }, notificationObject.autoTimeout);
                    }*/

                    startTimer(notificationObject);

                    currentlyShowingNotification = notificationObject;
                } else if (queue[0].immediate === true) {

                    /*if (currentlyShowingNotification.autoTimeout) {
                        $timeout.cancel(currentlyShowingNotification.timer);
                        currentlyShowingNotification.timer = 0;
                    }*/
                    stopTimer(currentlyShowingNotification);
                    currentlyShowingNotification.node.addClass("hidden");
                    queue.splice(1, 0, currentlyShowingNotification);
                    currentlyShowingNotification = null;
                    showNextNotification();
                }
            }
        }

        function startTimer(notificationObject) {
            if (!!notificationObject.autoTimeout) {
                notificationObject.timer = $timeout(function () {
                    removeNotification(notificationObject);
                }, notificationObject.autoTimeout);
            }
        }

        function stopTimer(currentlyShowingNotification) {
            if (currentlyShowingNotification.autoTimeout) {
                $timeout.cancel(currentlyShowingNotification.timer);
                currentlyShowingNotification.timer = 0;
            }
        }

        function removeNotification(notificationObject) {
            var index, node, isRemoved;

            node = notificationObject.node;
            isRemoved = false;

            node.on("transitionend", function () {
                isRemoved = true;
                _remove();
            });

            node.removeClass("is-visible");

            /* In case if for some reason transitionend event doesn't fire,
             * eventually remove it from the DOM and queue
              */
            $timeout(function () {
                if (isRemoved === false) {
                    _remove();
                }
            }, 2500);

            function _remove() {
                node.remove();

                if (notificationObject === currentlyShowingNotification) {
                    currentlyShowingNotification = null;
                }

                /* Destroy the scope */
                if (notificationObject.destroyScope) {
                    notificationObject.$scope.$destroy();
                }

                showNextNotification();
            }
        }

        function getDialogTemplate() {
            /*eslint-disable indent */
            return $([
                "<div class='buds-notification-container bottom-right'>",
                    "<div class='buds-notification-close'>",
                        "<buds-svg-provider name='icon-x'></buds-svg-provider>",
                    "</div>",
                    "<div class='buds-notification-content'></div>",
                "</div>"
            ].join(""));
            /*eslint-enable indent */
        }

    }


})();
