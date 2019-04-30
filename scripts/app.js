(function() {
    'use strict';

    /**
     * @ngdoc overview
     * @name territoryApp
     * @description
     * # territoryApp
     *
     * Main module of the application.
     */
    angular.module('territoryApp', ['ngRoute', 'ngSanitize', 'ui.bootstrap'])
        .config(['$routeProvider', '$compileProvider', '$locationProvider', 'VEEVA_MESSAGES', AppConfig]);

        function AppConfig($routeProvider, $compileProvider, $locationProvider, VEEVA_MESSAGES) {
            $locationProvider.hashPrefix('');
            // begin special case for windows platform
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|ghttps?|ms-appx|x-wmapp0|ms-local-stream):/);
            $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ms-local-stream|file|data):/);
            // end special case for windows platform

            var requiredMessages = VEEVA_MESSAGES;
            var requiredMessagesList = [];
            var translatedMessages = {};

            angular.forEach(requiredMessages, function(msg) {
                requiredMessagesList.push(msg);
            });

            var originalWhen = $routeProvider.when;

            $routeProvider.when = function(path, route) {
                route.resolve = {
                    globalData: ['$q', 'userService', 'messageService', 'labelService', function($q, userService, messageService, labelService) {
                        var deferred = $q.defer();

                        userService.fetchCurrentUser().then(function() {
                            if(messageService.getTranslatedMessages()) {
                                deferred.resolve();
                            } else {
                                var defaultLanguageLocale = 'en_US';
                                var languageLocale = userService.getCurrentUser().LanguageLocaleKey || defaultLanguageLocale;

                                messageService.fetchTranslations(requiredMessagesList, languageLocale).then(function(rawTranslations) {
                                    if(!rawTranslations.length) {
                                        messageService.fetchTranslations(requiredMessagesList, defaultLanguageLocale).then(function(rawTranslations) {
                                            setUpTranslations(rawTranslations);
                                            deferred.resolve();
                                        });
                                    } else {
                                        setUpTranslations(rawTranslations);
                                        deferred.resolve();
                                    }
                                });
                            }
                        });

                        function setUpTranslations(rawTranslations) {
                            angular.forEach(requiredMessages, function(msg, key) {
                                var foundTranslation = _.find(rawTranslations, function(rawMsg) {
                                    return msg.msgName === rawMsg.Name.value && msg.msgCategory === rawMsg.Category_vod__c.value;
                                });

                                if(foundTranslation) {
                                    translatedMessages[key] = foundTranslation.Text_vod__c.display;
                                }
                            });
                            messageService.setTranslatedMessages(translatedMessages);
                            labelService.mergeInVeevaMessages();
                        }

                        return deferred.promise;
                    }]
                };
                return originalWhen.call($routeProvider, path, route);
            };

            $routeProvider
                .when('/callActivity', {
                    templateUrl: 'views/call-activity.html',
                    controller: 'CallActivityController',
                    controllerAs: 'call'
                });
        }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .value('filterType', {
            dateRangePicker: {
                value: 'dateRangePicker'
            },
            territory: {
                value: 'territory'
            },
            product: {
                value: 'product'
            },
            callStatus: {
                value: 'callStatus'
            },
            callType: {
                value: 'callType'
            }
        });
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .value('labels', {
            accountName: {
                value: 'accountName',
                display: 'NAME'
            },
            calls: {
                value: 'calls',
                display: 'CALLS'
            },
            samplePercentage: {
                value: 'samplePercentage',
                display: '% SAMPLES'
            },
            samples: {
                value: 'samples',
                display: 'SAMPLES'
            },
            clmPercentage: {
                value: 'clmPercentage',
                display: '% CLM'
            },
            avgDetails: {
                value: 'avgDetails',
                display: 'AVG. DETAILS'
            },
            frequency: {
                value: 'frequency',
                display: 'FREQUENCY'
            },
            accountCount: {
                value: 'accountCount',
                display: '# OF ACCOUNTS'
            },
            accountPercentage: {
                value: 'accountPercentage',
                display: '% OF ACCOUNTS'
            },
            product: {
                value: 'product',
                display: 'PRODUCT'
            },
            accountId: {
                value: 'accountId',
                display: 'ACCOUNT ID'
            },
            emails: {
                value: 'emails',
                display: 'EMAILS'
            },
            openPercentage: {
                value: 'openPercentage',
                display: '% OPENED'
            },
            opened: {
                value: 'opened',
                display: 'OPENED'
            },
            emailTemplateName: {
                value: 'emailTemplateName',
                display: 'EMAIL TEMPLATE NAME'
            },
            emailFragmentName: {
                value: 'emailFragmentName',
                display: 'EMAIL FRAGMENT NAME'
            },
            callStatus: {
                value: 'callStatus',
                display: 'Call Status'
            },
            callType: {
                value: 'callType',
                display: 'Call Type'
            }
        });
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .value('queries', {
            calls: {
                object: 'Call2_vod__c',
                fields: ['Id', 'Account_vod__c', 'Call_Date_vod__c', 'CLM_vod__c', 'Status_vod__c', 'Call_Type_vod__c'],
                where: 'Call_Date_vod__c >= _date1 AND Call_Date_vod__c <= _date2'
            },
            callDetails: {
                object: 'Call2_Detail_vod__c',
                fields: ['Id', 'Call2_vod__c', 'Product_vod__c'],
                where: 'Call2_vod__c IN '
            },
            callSamples: {
                object: 'Call2_Sample_vod__c',
                fields: ['Id', 'Account_vod__c', 'Call2_vod__c', 'Call_Date_vod__c', 'Quantity_vod__c'],
                where: 'Call2_vod__c IN '
            },
            allTerritories: {
                object: 'Territory',
                fields: ['Id', 'Name']
            },
            userTerritory: {
                object: 'UserTerritory',
                fields: ['Id', 'TerritoryId'],
                where: 'UserId = _userId'
            },
            group: {
                object: 'Group',
                fields: ['Id', 'RelatedId'],
                where: 'Type = _type AND RelatedId IN '
            },
            accountShare: {
                object: 'AccountShare',
                fields: ['Id', 'AccountId', 'UserOrGroupId'],
                where: 'UserOrGroupId IN '
            },
            allAccounts: {
                object: 'Account',
                fields: ['Id', 'Name', 'FirstName', 'LastName']
            },
            accounts: {
                object: 'Account',
                fields: ['Id', 'Name', 'FirstName', 'LastName'],
                where: 'Id IN '
            },
            products: {
                object: 'Product_vod__c',
                fields: ['Id', 'Name'],
                where: 'Product_Type_vod__c = _productType AND Id IN '
            },
            mySetupProducts: {
                object: 'My_Setup_Products_vod__c',
                fields: ['Id', 'Product_vod__c'],
                where: 'Product_vod__c IN '
            },
            allMySetupProducts: {
                object: 'My_Setup_Products_vod__c',
                fields: ['Id', 'Product_vod__c']
            },
            sentEmails: {
                object: 'Sent_Email_vod__c',
                fields: ['Id', 'Account_vod__c', 'Status_vod__c', 'Opened_vod__c', 'Approved_Email_Template_vod__c', 'Email_Fragments_vod__c', 'Email_Sent_Date_vod__c', 'Product_vod__c'],
                where: 'Email_Sent_Date_vod__c >= _date1 AND Email_Sent_Date_vod__c <= _date2'
            },
            approvedDocuments: {
                object: 'Approved_Document_vod__c',
                fields: ['Id', 'Name', 'RecordTypeId'],
                where: 'Id IN '
            },
            user: {
                object: 'User',
                fields: ['Id', 'LanguageLocaleKey'],
                where: 'Id = _userId'
            }
        });
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .constant('VEEVA_MESSAGES', {
            callActivity: {msgName: 'CALL_ACTIVITY', msgCategory: 'FieldReporting'},
            approvedEmailActivity: {msgName: 'APPROVED_EMAIL_ACTIVITY', msgCategory: 'FieldReporting'},
            avgCallsHcp: {msgName: 'AVG_CALLS_HCP', msgCategory: 'FieldReporting'},
            avgDetailsHcp: {msgName: 'AVG_DETAILS_HCP', msgCategory: 'FieldReporting'},
            avgCallsDay: {msgName: 'AVG_CALLS_DAY', msgCategory: 'FieldReporting'},
            callFrequencyTrend: {msgName: 'CALL_FREQUENCY_TREND', msgCategory: 'FieldReporting'},
            mostFrequentActs: {msgName: 'MOST_FREQUENT_ACCOUNTS', msgCategory: 'FieldReporting'},
            leastFrequentActs: {msgName: 'LEAST_FREQUENT_ACCOUNTS', msgCategory: 'FieldReporting'},
            accounts: {msgName: 'ACCOUNTS', msgCategory: 'FieldReporting'},
            accountPercentage: {msgName: 'PCT_ACCOUNTS', msgCategory: 'FieldReporting'},
            timeOnTerritory: {msgName: 'TIME_ON_TERRITORY', msgCategory: 'FieldReporting'},
            emailReach: {msgName: 'EMAIL_REACH', msgCategory: 'FieldReporting'},
            emailFrequency: {msgName: 'EMAIL_FREQUENCY', msgCategory: 'FieldReporting'},
            avgEmailsHcp: {msgName: 'AVG_EMAILS_HCP', msgCategory: 'FieldReporting'},
            avgEmailsDay: {msgName: 'AVG_EMAILS_DAY', msgCategory: 'FieldReporting'},
            mostSentEmails: {msgName: 'MOST_SENT_EMAILS', msgCategory: 'FieldReporting'},
            mostOpenEmails: {msgName: 'MOST_OPEN_EMAILS', msgCategory: 'FieldReporting'},
            emails: {msgName: 'EMAILS', msgCategory: 'FieldReporting'},
            emailFrequencyTrend: {msgName: 'EMAIL_FREQUENCY_TREND', msgCategory: 'FieldReporting'},
            template: {msgName: 'TEMPLATE', msgCategory: 'FieldReporting'},
            fragment: {msgName: 'FRAGMENT', msgCategory: 'FieldReporting'},
            reach: {msgName: 'Reach', msgCategory: 'Analytics'},
            daily: {msgName: 'Daily', msgCategory: 'Analytics'},
            weekly: {msgName: 'Weekly', msgCategory: 'Analytics'},
            calls: {msgName: 'Calls', msgCategory: 'Analytics'},
            frequency: {msgName: 'Frequency', msgCategory: 'Analytics'},
            territory: {msgName: 'Territory', msgCategory: 'Analytics'},
            product: {msgName: 'Product', msgCategory: 'Mysetup'},
            samples: {msgName: 'SET_SAMPLES', msgCategory: 'TABLET'},
            all: {msgName: 'ALL', msgCategory: 'Common'}
        });
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .filter('customFilter', filterFn);

    function filterFn() {
        return function(input, orderKey) {
            if(!angular.isArray(input) || !angular.isString(orderKey)) {
                return input;
            }

            var asc = true;
            if(orderKey.charAt(0) === '-') {
                orderKey = orderKey.substr(1);
                asc = false;
            }

            input.sort(function(a, b) {
                if(!angular.isDefined(a[orderKey]) || !angular.isDefined(b[orderKey])) {
                    return 0;

                } else if(angular.isNumber(a[orderKey]) && angular.isNumber(b[orderKey])) {
                    if(asc) {
                        return numberCompare(a[orderKey], b[orderKey]);
                    } else {
                        return numberCompare(a[orderKey], b[orderKey]) * -1;
                    }

                } else if(angular.isString(a[orderKey]) && angular.isString(b[orderKey])) {
                    var stringA = a[orderKey];
                    var stringB = b[orderKey];

                    // Percentage string 'xx%' comparison
                    var percentageCapture = /([0-9]+[\.]?[0-9]+)%/;
                    if(percentageCapture.test(stringA) && percentageCapture.test(stringB)) {
                        var percentA = percentageCapture.exec(stringA)[1];
                        var percentB = percentageCapture.exec(stringB)[1];

                        if(asc) {
                            return numberCompare(percentA, percentB);
                        } else {
                            return numberCompare(percentA, percentB) * -1;
                        }

                    }
                    // Pure string comparison
                    else {
                        if(asc) {
                            return stringA.localeCompare(stringB);
                        } else {
                            return stringA.localeCompare(stringB) * -1;
                        }
                    }
                } else {
                    return 0;
                }
            });

            function numberCompare(num1, num2) {
                num1 = parseFloat(num1);
                num2 = parseFloat(num2);

                if(num1 > num2) {
                    return 1;
                } else if(num1 < num2) {
                    return -1;
                } else {
                    return 0;
                }
            }

            return input;
        };
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .filter('message', ['messageService', filterFn]);

    function filterFn(messageService) {
        return function(input) {
            if(!input) {
                return;
            }

            return messageService.getMessage(input);
        };
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('accountService', ['$q', 'endpoints', 'labelService', factoryFn]);

        function factoryFn($q, endpoints, labelService) {
            var accountService = this;
            var accounts = {};

            accountService.fetchAccountForTerritory = function(territoryIds) {
                var deferred = $q.defer();

                if(angular.isArray(territoryIds)) {
                    endpoints.getAccountsForTerritory(territoryIds).then(function(resp) {

                        if(!accounts.data) {
                            accounts = resp;
                            fillInLabelTranslations(resp.fieldLabels);
                        }

                        deferred.resolve(resp);
                    });
                }

                return deferred.promise;
            };

            accountService.getAllAccounts = function() {
                return accounts.data || [];
            };

            function fillInLabelTranslations(fieldLabels) {
                var labelMap = _.indexBy(fieldLabels, 'name');
                if(labelMap.Name) {
                    labelService.setTranslation('accountName', labelMap.Name.display);
                }
            }

            return accountService;
        }
})();


(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('approvedDocumentService', ['$q', 'endpoints', 'labelService', factoryFn]);

    function factoryFn($q, endpoints, labelService) {
        var approvedDocumentService = this;
        var approvedDocuments = {};

        approvedDocumentService.fetchApprovedDocuments = function(ids) {
            var deferred = $q.defer();

            if(approvedDocuments.data) {
                var result = {};
                result.data = filterApprovedDocumentByIds(ids);
                deferred.resolve(result);

            } else if(angular.isArray(ids)) {
                endpoints.getApprovedDocuments(ids).then(function(resp) {
                    console.log(resp);
                    approvedDocuments = resp;
                    fillInLabelTranslations(resp.fieldLabels);
                    deferred.resolve(approvedDocuments);
                });
            }

            return deferred.promise;
        };

        approvedDocumentService.findApprovedDocumentById = function(id) {
            return _.find(approvedDocuments.data, function(approvedDoc) {
                return approvedDoc.Id && approvedDoc.Id.value === id;
            });
        };

        function filterApprovedDocumentByIds(ids) {
            var result = [];

            angular.forEach(approvedDocuments.data, function(approvedDoc) {
                if(approvedDoc.Id && _.contains(ids, approvedDoc.Id.value)) {
                    result.push(approvedDoc);
                }
            });

            return result;
        }

        function fillInLabelTranslations(fieldLabels) {
            var labelMap = _.indexBy(fieldLabels, 'name');
            if(labelMap.Name) {
                labelService.setTranslation('emailTemplateName', labelMap.Name.display);
                labelService.setTranslation('emailFragmentName', labelMap.Name.display);
            }
        }

        return approvedDocumentService;
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('callDetailService', ['$q', 'endpoints', factoryFn]);

    function factoryFn($q, endpoints) {
        var callDetailService = this;
        var callDetails = {};

        callDetailService.fetchCallDetailData = function(callIds) {
            var deferred = $q.defer();

            if(callDetails.data) {
                var result = {};
                result.data = filterCallDetailByCallIds(callIds);
                deferred.resolve(result);

            } else if(angular.isArray(callIds)) {
                endpoints.getCallDetails(callIds).then(function(resp1) {
                    console.log(resp1);
                    callDetails = resp1;

                    // Query products table to get product name
                    endpoints.getProducts(getProductIdsFromCallDetails()).then(function(resp2) {
                        console.log(resp2);
                        var products = resp2.data;

                        angular.forEach(callDetails.data, function(cDetail) {
                            if(cDetail.Product_vod__c) {
                                var foundProduct = _.find(products, function(product) {
                                    return product.Id && product.Id.value === cDetail.Product_vod__c.value;
                                });

                                if(foundProduct) {
                                    cDetail.productName = foundProduct.Name;
                                }
                            }
                        });

                        // Filter out product without product name(aka. product group)
                        callDetails.data = _.filter(callDetails.data, function(cDetail) {
                            return cDetail.productName;
                        });

                        deferred.resolve(callDetails);
                    });
                });
            }

            return deferred.promise;
        };

        function getProductIdsFromCallDetails() {
            var productIds = [];

            angular.forEach(callDetails.data, function(callDetail) {
                if(callDetail.Product_vod__c) {
                    productIds.push(callDetail.Product_vod__c.value);
                }
            });

            return productIds;
        }

        function filterCallDetailByCallIds(callIds) {
            var result = [];

            angular.forEach(callDetails.data, function(cDetail) {
                if(cDetail.Call2_vod__c && _.contains(callIds, cDetail.Call2_vod__c.value)) {
                    result.push(cDetail);
                }
            });

            return result;
        }

        return callDetailService;
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('callSampleService', ['$q', 'endpoints', factoryFn]);

    function factoryFn($q, endpoints) {
        var callSampleService = this;
        var callSamples = {};

        callSampleService.fetchCallSampleData = function(callIds) {
            var deferred = $q.defer();

            if(callSamples.data) {
                var result = {};
                result.data = filterCallSampleByCallIds(callIds);
                deferred.resolve(result);

            } else if(angular.isArray(callIds)) {
                endpoints.getCallSamples(callIds).then(function(resp) {
                    console.log(resp);
                    callSamples = resp;
                    deferred.resolve(callSamples);
                });
            }

            return deferred.promise;
        };

        function filterCallSampleByCallIds(callIds) {
            var result = [];

            angular.forEach(callSamples.data, function(cSample) {
                if(cSample.Call2_vod__c && _.contains(callIds, cSample.Call2_vod__c.value)) {
                    result.push(cSample);
                }
            });

            return result;
        }

        return callSampleService;
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('callService', ['$q', 'endpoints', 'callDetailService', 'labelService', 'reportUtil', factoryFn]);

    function factoryFn($q, endpoints, callDetailService, labelService, reportUtil) {
        var callService = this;
        var calls = {};
        var today = new Date((new Date()).toDateString());
        var veevaUtil = new VeevaUtilities();

        // Start Date: 6 months from today
        var fixedStartDate = new Date((new Date(today)).setMonth(today.getMonth() - 6));
        // End Date: At the end of today
        // var fixedEndDate = reportUtil.normalizeDate(today, true);
        
        var fixedEndDate = new Date((new Date(today)).setMonth(today.getMonth() + 6));



        var vSeasonStart = ['-01-01T00:00:00.000Z','-04-01T00:00:00.000Z','-07-01T00:00:00.000Z','-10-01T00:00:00.000Z'];
        var now = new Date(); //当前日期 
        var nowMonth = now.getMonth(); //当前月
        var nowYear = now.getYear(); //当前年
        var monthIndex = nowMonth/3;

        // fixedStartDate = nowYear + vSeasonStart[monthIndex];
        // fixedEndDate = nowYear;
        // if (monthIndex == 4) {
        //     fixedEndDate += 1;
        // }
        // fixedEndDate += vSeasonStart[(monthIndex + 1)/4];

        var currentStartDate = fixedStartDate;
        var currentEndDate = fixedEndDate;

        callService.fetchCallData = function(date1, date2) {
            var deferred = $q.defer();

            if(angular.isDate(date1)) {
                currentStartDate = date1;
            }
            if(angular.isDate(date2)) {
                currentEndDate = date2;
            }

            if(calls.data) {
                deferred.resolve({
                    success: true,
                    data: filterCallsByDateRange(currentStartDate, currentEndDate)
                });

            } else {
                endpoints.getCalls(currentStartDate, currentEndDate).then(function(resp) {
                    console.log(resp);
                    calls = resp;
                    fillInLabelTranslations(calls.fieldLabels);
                    deferred.resolve({
                        success: true,
                        data: calls.data
                    });
                }, function(error) {
                    deferred.reject({
                        success: false,
                        message: error
                    });
                });
            }

            return deferred.promise;
        };

        callService.getStartDate = function() {
            return currentStartDate;
        };

        callService.getEndDate = function() {
            return currentEndDate;
        };

        callService.getFixedStartDate = function() {
            return fixedStartDate;
        };

        callService.getFixedEndDate = function() {
            return fixedEndDate;
        };

        callService.getCalls = function() {
          // Copy/store in local var can improve performance
          var _callsData = veevaUtil.deepCopy(calls.data);
          return _callsData || [];
        };

        callService.getCallsForProductId = function(productId) {
            var deferred = $q.defer();
            var result = [];

            if(!productId) {
              // Copy/store in local var can improve performance
              var _callsData = veevaUtil.deepCopy(calls.data);
              deferred.resolve(_callsData || result);
            }

            callDetailService.fetchCallDetailData(getCallIdsFromCalls()).then(function(resp) {
                var tracker = {};
                var callIds = [];
                angular.forEach(resp.data, function(cDetail) {
                    if(cDetail.Product_vod__c && cDetail.Product_vod__c.value === productId) {
                        if(cDetail.Call2_vod__c && !tracker[cDetail.Call2_vod__c.value]) {
                            callIds.push(cDetail.Call2_vod__c.value);
                            tracker[cDetail.Call2_vod__c.value] = true;
                        }
                    }
                });

                angular.forEach(callIds, function(callId) {
                    angular.forEach(calls.data, function(aCall) {
                        if(aCall.Id && aCall.Id.value === callId) {
                            result.push(aCall);
                        }
                    });
                });

                deferred.resolve(result);
            });

            return deferred.promise;
        };

        function filterCallsByDateRange(date1, date2) {
            // var result = _.filter(calls.data, function(aCall) {
            //     if(aCall.Call_Date_vod__c && angular.isDate(aCall.Call_Date_vod__c.value)) {
            //         return aCall.Call_Date_vod__c.value.valueOf() >= date1.valueOf() && aCall.Call_Date_vod__c.value.valueOf() <= date2.valueOf();
            //     } else {
            //         return false;
            //     }
            // });

            // return result;
            return calls.data;
        }

        function getCallIdsFromCalls() {
            var callIds = [];

            angular.forEach(calls.data, function(aCall) {
                if(aCall.Id) {
                    callIds.push(aCall.Id.value);
                }
            });

            return callIds;
        }

        function fillInLabelTranslations(fieldLabels) {
            var labelMap = _.indexBy(fieldLabels, 'name');
            if(labelMap.CLM_vod__c) {
                labelService.setTranslation('clmPercentage', '% ' + labelMap.CLM_vod__c.display);
            }
            if(labelMap.Status_vod__c) {
                labelService.setTranslation('callStatus', labelMap.Status_vod__c.display);
            }
            if(labelMap.Call_Type_vod__c) {
                labelService.setTranslation('callType', labelMap.Call_Type_vod__c.display);
            }
        }

        return callService;
    }
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('endpoints', ['$q', 'queries', factoryFn]);

    function factoryFn($q, queries) {
        var endpoints = this;
        var ds = window.ds;
        var veevaUtil = new VeevaUtilities();

        endpoints.getCurrentUser = function() {
            var deferred = $q.defer();

            ds.getDataForCurrentObject('User', 'Id').then(function(resp1) {
                if(resp1.success) {
                    var currentUser = resp1.User;
                    var queryConfig = veevaUtil.copyObject(queries.user);
                    queryConfig.where = queryConfig.where.replace(/_userId/, '\'' + currentUser.Id + '\'');

                    ds.runQuery(queryConfig).then(function (resp2) {
                        deferred.resolve(resp2);
                    }, genericQueryErrorHandler(deferred));

                } else {
                    (genericQueryErrorHandler(deferred))(resp1.message);
                }
            });

            return deferred.promise;
        };

        endpoints.getCalls = function(startDate, endDate) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.calls);
            var date1 = formatDateString(startDate);
            var date2 = formatDateString(endDate);
            queryConfig.where = queryConfig.where.replace(/_date1/, '\'' + date1 + '\'');
            queryConfig.where = queryConfig.where.replace(/_date2/, '\'' + date2 + '\'');

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getCallDetails = function(callIds) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.callDetails);
            queryConfig.where += ds.getInStatement(callIds);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getCallSamples = function(callIds) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.callSamples);
            queryConfig.where += ds.getInStatement(callIds);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getAllTerritories = function() {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.allTerritories);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getUserTerritories = function(userId) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.userTerritory);
            queryConfig.where = queryConfig.where.replace(/_userId/, '\'' + userId + '\'');

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getGroup = function(type, relatedIds) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.group);
            queryConfig.where = queryConfig.where.replace(/_type/, '\'' + type + '\'');
            queryConfig.where += ds.getInStatement(relatedIds);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getAccountShare = function(groupIds) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.accountShare);

            if(angular.isArray(groupIds)) {
                queryConfig.where += ds.getInStatement(groupIds);

                ds.runQuery(queryConfig).then(function (resp) {
                    deferred.resolve(resp);
                }, genericQueryErrorHandler(deferred));
            }

            return deferred.promise;
        };

        endpoints.getAllAccounts = function() {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.allAccounts);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getAccount = function(accountIds) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.accounts);
            queryConfig.where += ds.getInStatement(accountIds);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getAccountsForTerritory = function(territoryIds) {
            var deferred = $q.defer();

            endpoints.getGroup('Territory', territoryIds).then(function(gResp) {
                var groups = gResp.data;
                var groupIds = [];

                for(var j = 0; j < groups.length; j++) {
                    groupIds.push(groups[j].Id.value);
                }

                endpoints.getAccountShare(groupIds).then(function(asResp) {
                    var accountShares = asResp.data;
                    var accountIds = [];

                    for(var k = 0; k < accountShares.length; k++) {
                        accountIds.push(accountShares[k].AccountId.value);
                    }

                    endpoints.getAccount(accountIds).then(function(aResp) {
                        deferred.resolve(aResp);
                    });
                });
            });

            return deferred.promise;
        };

        endpoints.getProducts = function(productIds) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.products);
            queryConfig.where = queryConfig.where.replace(/_productType/, '\'Detail\'');
            queryConfig.where += ds.getInStatement(productIds);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getMySetupProducts = function(productIds) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.mySetupProducts);
            queryConfig.where += ds.getInStatement(productIds);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getAllMySetupProducts = function() {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.allMySetupProducts);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getSentEmails = function(startDate, endDate) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.sentEmails);
            var date1 = startDate.toISOString();
            var date2 = endDate.toISOString();
            queryConfig.where = queryConfig.where.replace(/_date1/, '\'' + date1 + '\'');
            queryConfig.where = queryConfig.where.replace(/_date2/, '\'' + date2 + '\'');

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getApprovedDocuments = function(ids) {
            var deferred = $q.defer();
            var queryConfig = veevaUtil.copyObject(queries.approvedDocuments);
            queryConfig.where += ds.getInStatement(ids);

            ds.runQuery(queryConfig).then(function (resp) {
                deferred.resolve(resp);
            }, genericQueryErrorHandler(deferred));

            return deferred.promise;
        };

        endpoints.getTranslations = function(msgsToGet, userLocale) {
            var deferred = $q.defer();

            ds.getVeevaMessagesWithDefault(msgsToGet, userLocale).then(function (resp) {
                deferred.resolve(resp);
            });

            return deferred.promise;
        };


        /**
         * Private functions
         */
        function genericQueryErrorHandler(deferred) {
            return function(error) {
                console.log('genericQueryErrorHandler', error);
                deferred.reject(error);
            };
        }

        /**
         * Format date object to be yyyy-mm-dd
         * @param date
         * @returns {string}
         */
        function formatDateString(date) {
            var year = date.getFullYear();
            var month = date.getMonth() + 1 + '';
            var day = date.getDate() + '';

            if(month.length === 1) {
                month = '0' + month;
            }

            if(day.length === 1) {
                day = '0' + day;
            }

            return year + '-' + month + '-' + day;
        }

        return endpoints;
    }
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('labelService', ['labels', 'messageService', factoryFn]);

    function factoryFn(labels, messageService) {
        var labelService = this;
        var veevaUtil = new VeevaUtilities();
        labelService.labels = veevaUtil.deepCopy(labels);

        labelService.setTranslation = function(key, translation) {
            if(labelService.labels[key]) {
                labelService.labels[key].display = translation;
            }
        };

        labelService.mergeInVeevaMessages = function() {
            labelService.setTranslation('calls', messageService.getMessage('calls'));
            labelService.setTranslation('emails', messageService.getMessage('emails'));
            labelService.setTranslation('product', messageService.getMessage('product'));
            labelService.setTranslation('frequency', messageService.getMessage('frequency'));
            labelService.setTranslation('accountCount', messageService.getMessage('accounts'));
            labelService.setTranslation('accountPercentage', messageService.getMessage('accountPercentage'));
            labelService.setTranslation('avgDetails', messageService.getMessage('avgDetailsHcp'));
            labelService.setTranslation('samples', messageService.getMessage('samples'));
            labelService.setTranslation('samplePercentage', '% ' + messageService.getMessage('samples'));
        };

        return labelService;
    }
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('messageService', ['$q', 'endpoints', factoryFn]);

    function factoryFn($q, endpoints) {
        var messageService = this;
        var translatedMessages = null;

        messageService.fetchTranslations = function(msgsToGet, userLocale) {
            var deferred = $q.defer();

            endpoints.getTranslations(msgsToGet, userLocale).then(function(resp) {
                deferred.resolve(resp);
            });

            return deferred.promise;
        };

        messageService.getTranslatedMessages = function() {
            return translatedMessages;
        };

        messageService.setTranslatedMessages = function(translatedMsg) {
            translatedMessages = translatedMsg;
        };

        messageService.getMessage = function(key) {
            if(translatedMessages && translatedMessages[key]) {
                return translatedMessages[key];
            } else {
                return key;
            }
        };

        return messageService;
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('productService', ['$q', 'endpoints', factoryFn]);

    function factoryFn($q, endpoints) {
        var productService = this;
        var mySetupProducts = {};
        var veevaUtil = new VeevaUtilities();

        productService.fetchMySetupProducts = function() {
            var deferred = $q.defer();

            if(mySetupProducts.data) {
                var _mySetupProducts = veevaUtil.deepCopy(mySetupProducts);
                deferred.resolve(_mySetupProducts);

            } else {
                endpoints.getAllMySetupProducts().then(function(resp1) {
                    console.log(resp1);
                    mySetupProducts = resp1;

                    // Query products table to get product name
                    endpoints.getProducts(getProductIdsFromMySetupProducts()).then(function(resp2) {
                        console.log(resp2);
                        var products = resp2.data;
                        var productTracker = {};

                        angular.forEach(mySetupProducts.data, function(mySetupProduct) {
                            if(mySetupProduct.Product_vod__c && mySetupProduct.Product_vod__c.value !== '' && !productTracker[mySetupProduct.Product_vod__c.value]) {
                                var foundProduct = _.find(products, function(product) {
                                    return product.Id && product.Id.value === mySetupProduct.Product_vod__c.value;
                                });

                                if(foundProduct) {
                                    mySetupProduct.productName = foundProduct.Name;
                                }
                                productTracker[mySetupProduct.Product_vod__c.value] = true;
                            }
                        });

                        // Filter out product without product name(aka. product group)
                        mySetupProducts.data = _.filter(mySetupProducts.data, function(mySetupProduct) {
                            return mySetupProduct.productName;
                        });

                        deferred.resolve(mySetupProducts);
                    });
                });
            }

            return deferred.promise;
        };

        productService.getMySetupProducts = function() {
            var _mySetupProductsData = veevaUtil.deepCopy(mySetupProducts.data);
            return  _mySetupProductsData || [];
        };

        function getProductIdsFromMySetupProducts() {
            var productIds = [];
            var productTracker = {};

            angular.forEach(mySetupProducts.data, function(mySetupProduct) {
                if(mySetupProduct.Product_vod__c && mySetupProduct.Product_vod__c.value !== '' && !productTracker[mySetupProduct.Product_vod__c.value]) {
                    productIds.push(mySetupProduct.Product_vod__c.value);
                    productTracker[mySetupProduct.Product_vod__c.value] = true;
                }
            });

            return productIds;
        }

        return productService;
    }
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('reportUtil', factoryFn);

    function factoryFn() {
        var reportUtil = this;
        var DAYS_IN_A_WEEK = 7;

        /**
         * Get a list of common items from two arrays
         * @param array1
         * @param array2
         * @param onKey - The key the comparison will be based on
         * @returns {Array}
         */
        reportUtil.findCommonItems = function(array1, array2, onKey) {
            var commonItems = [];

            angular.forEach(array1, function(itemA) {
                if(itemA[onKey]) {
                    angular.forEach(array2, function(itemB) {
                        if(itemB[onKey] && itemA[onKey].value === itemB[onKey].value) {
                            commonItems.push(itemA);
                        }
                    });
                }
            });

            return commonItems;
        };

        /**
         * Helper function to generate data for daily frequency chart
         * @param data - the data collection
         * @param dateKey - the property name to get the date from
         * @param dataAvg
         * @returns {{labels: string[], data: Array}}
         */
        reportUtil.generateDailyFrequencyChartData = function(data, dateKey, dataAvg) {
            var voc = {planned:0, submitted:0, saved:0, total:0};

            var calls = data || [];
            angular.forEach(calls, function(cDetail) {
                if(cDetail["Status_vod__c"].value === 'Planned_vod') {
                    voc.planned += 1;
                } else if (cDetail["Status_vod__c"].value === 'Submitted_vod') {
                    voc.submitted += 1;
                } else if(cDetail["Status_vod__c"].value === 'Saved_vod') {
                    voc.saved += 1;
                }
                voc.total += 1;
            });
            var chartData = [];
            // planned:0, submitted:0, saved:0, total:0,};
            // var callGroup = [3, 2, 5];
            var callGroup = [voc.planned, voc.submitted, voc.saved];
            chartData.push(callGroup);
            chartData.push(callGroup);

            var lastTitle = JSON.stringify(calls);
            if (lastTitle.length > 80) {
                lastTitle =  lastTitle.substr(0, 80);
            }
            return {
                labels: ["Planned", "Submmited", "Saved"],
                // labels: ["Planned", "Submmited", lastTitle],
                data: chartData
            };
            // var dataByWeekday = groupDataByWeekday(data, dateKey);
            // var chartData = [];
            // var dataAverage = [];
            // var dataFrequency = [];

            // for(var i = 0; i < 7; i++) {
            //     dataAverage[i] = dataAvg;

            //     if(!dataByWeekday[i]) {
            //         dataFrequency[i] = 0;
            //     } else {
            //         dataFrequency[i] = dataByWeekday[i].length;
            //     }
            // }

            // chartData.push(dataAverage);
            // chartData.push(dataFrequency);

            // return {
            //     labels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
            //     data: chartData
            // };
        };

        /**
         * Helper function to generate data for weekly frequency chart
         * @param data - the data collection
         * @param dateKey - the property name to get the date from
         * @param dataAvg
         * @returns {{labels: Array, data: Array}}
         */
        reportUtil.generateWeeklyFrequencyChartData = function(data, dateKey, dataAvg) {
            var weekList = groupDataByWeek(data, dateKey);
            var chartData = [];
            var dataAverage = [];
            var dataFrequency = [];
            var dataLabels = [];

            angular.forEach(weekList, function(week) {
                dataAverage.push(dataAvg);
                dataLabels.push(reportUtil.formatDateToChartLabel(week.startDate));

                if(angular.isArray(week.data)) {
                    dataFrequency.push(week.data.length);
                } else {
                    dataFrequency.push(0);
                }
            });

            chartData.push(dataAverage);
            chartData.push(dataFrequency);

            return {
                labels: dataLabels,
                data: chartData
            };
        };

        /**
         * Count the total amount of days in between the given two dates
         * @param date1
         * @param date2
         * @returns {number}
         */
        reportUtil.countDaysInBetween = function(date1, date2) {
            if(angular.isDate(date1) && angular.isDate(date2)) {
                if(date2.valueOf() - date1.valueOf() >= 0) {
                    return Math.round((date2.valueOf() - date1.valueOf()) / (1000*60*60*24));
                }
            }

            return 0;
        };

        /**
         * Format the given date object into MMM d (e.g. Jan 1)
         * @param date
         * @returns {string}
         */
        reportUtil.formatDateToChartLabel = function(date) {
            var formattedString = '';

            if(angular.isDate(date)) {
                var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                formattedString = months[date.getMonth()] + ' ' + date.getDate();
            }

            return formattedString;
        };

        /**
         * Format account name to be LastName, FirstName
         * @param account
         * @returns {*}
         */
        reportUtil.formatAccountName = function(account) {
            var formattedName = null;

            if(account && account.Name) {
                if(account.FirstName && account.FirstName.value) {
                    if(account.FirstName.value.length > 0) {
                        formattedName = account.FirstName.value;
                    }
                }
                if(account.LastName && account.LastName.value) {
                    if(formattedName && account.LastName.value.length > 0) {
                        formattedName = account.LastName.value + ', ' + formattedName;
                    } else if(account.LastName.value.length > 0) {
                        formattedName = account.LastName.value;
                    }
                }

                if(!formattedName) {
                    formattedName = account.Name.value;
                }
            }

            return formattedName;
        };

        /**
         * Build on top of underscore _.sortBy function
         * Sort the given list(array/object) based on the value of the given key
         * @param list - Array/Object
         * @param key - (optional) where to get the value from
         * @param caseSensitive - (optional) set to make the sort order case sensitive
         * @param desc - (optional) set to make the sort order descending
         * @returns {*}
         */
        reportUtil.sortByValue = function(list, key, caseSensitive, desc) {
            var result = _.sortBy(list, function(item) {
                var value = null;

                if(!key) {
                    value = item.value;
                } else if(item[key]) {
                    value = item[key].value;
                }

                if(angular.isString(value) && !caseSensitive) {
                    return value.toUpperCase();
                } else {
                    return value;
                }
            });

            if(desc) {
                result.reverse();
            }

            return result;
        };

        /**
         * Set the date value to the beginning of the day 00:00:000
         * If isEndDate = true, set it to the end of the day 23:59:999
         * @param date
         * @param isEndDate - Optional. If set, the return will output the end of the day value
         * @returns {*}
         */
        reportUtil.normalizeDate = function(date, isEndDate) {
            if(angular.isDate(date)) {
                if(isEndDate) {
                    var theDayAfter = reportUtil.normalizeDate(new Date(new Date(date.valueOf()).setDate(date.getDate() + 1)));
                    return new Date(theDayAfter.valueOf() - 1);
                } else {
                    return new Date(date.toDateString());
                }
            }
            return date;
        };

        /**
         * Group the data collection by weekday(Sun-0, Mon-1, Tue-2, and so on) based on the given dateKey property
         * @param data - the data collection
         * @param dateKey - The property name to get the date object from
         * @returns {{}}
         */
        function groupDataByWeekday(data, dateKey) {
            var dataByWeekday = {};

            angular.forEach(data, function(aData) {
                if(aData[dateKey] && angular.isDate(aData[dateKey].value)) {
                    var day = aData[dateKey].value.getDay();
                    if(!dataByWeekday[day]) {
                        dataByWeekday[day] = [];
                    }
                    dataByWeekday[day].push(aData);
                }
            });

            return dataByWeekday;
        }


        /**
         * Group the data collection by weeks based on the given dateKey property
         * First week and last week are based on the latest and oldest data record found in the data collection respectively
         * @param data - the data collection
         * @param dateKey - The property name to get the date object from
         * @returns {Array} - A list of week, containing the start and end date of the week, as well as the segregated data
         */
        function groupDataByWeek(data, dateKey) {
            // Shortcut the function if no data to work on
            if(!angular.isArray(data) || data.length === 0) {
                return [];
            }

            // Sort the data based on the specify date field
            var sortedDataByDate = _.sortBy(data, function(aData) {
                if(aData[dateKey] && angular.isDate(aData[dateKey].value)) {
                    return aData[dateKey].value.valueOf();
                }
            });

            // Create a virtual week list to segregate the data later on
            var weekMap = [];
            var oldestDate = sortedDataByDate[0][dateKey].value;
            var latestDate = sortedDataByDate[sortedDataByDate.length - 1][dateKey].value;

            var startDate = reportUtil.normalizeDate(new Date(new Date(oldestDate.valueOf()).setDate(oldestDate.getDate() - oldestDate.getDay())));
            var endDate = reportUtil.normalizeDate(new Date(new Date(startDate.valueOf()).setDate(startDate.getDate() + DAYS_IN_A_WEEK - 1)), true);

            while(startDate.valueOf() < latestDate.valueOf()) {
                weekMap.push({
                    startDate: startDate,
                    endDate: endDate
                });

                // Update startDate & endDate to the previous week's start & end date respectively
                startDate = new Date(endDate.valueOf() + 1);
                endDate = reportUtil.normalizeDate(new Date(new Date(startDate.valueOf()).setDate(startDate.getDate() + DAYS_IN_A_WEEK - 1)), true);
            }

            angular.forEach(sortedDataByDate, function(aData) {
                if(aData[dateKey] && angular.isDate(aData[dateKey].value)) {
                    var currentDate = aData[dateKey].value;
                    for(var i = 0; i < weekMap.length; i++) {
                        var currentWeek = weekMap[i];
                        if(currentDate.valueOf() >= currentWeek.startDate.valueOf() &&
                            currentDate.valueOf() <= currentWeek.endDate.valueOf()) {
                            if(!angular.isArray(currentWeek.data)) {
                                currentWeek.data = [];
                            }
                            currentWeek.data.push(aData);
                            break;
                        }
                    }
                }
            });

            return weekMap;
        }

        return reportUtil;
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('sentEmailService', ['$q', 'endpoints', 'labelService', 'reportUtil', factoryFn]);

    function factoryFn($q, endpoints, labelService, reportUtil) {
        var sentEmailService = this;
        var sentEmails = {};
        var today = new Date((new Date()).toDateString());

        // Start Date: 6 months from today
        var fixedStartDate = new Date((new Date(today)).setMonth(today.getMonth() - 6));
        // End Date: At the end of today
        var fixedEndDate = reportUtil.normalizeDate(today, true);

        var currentStartDate = fixedStartDate;
        var startEndDate = fixedEndDate;

        sentEmailService.fetchSentEmailData = function(date1, date2) {
            var deferred = $q.defer();

            if(angular.isDate(date1)) {
                currentStartDate = date1;
            }
            if(angular.isDate(date2)) {
                startEndDate = date2;
            }

            if(sentEmails.data) {
                deferred.resolve({
                    success: true,
                    data: filterSentEmailsByDateRange(currentStartDate, startEndDate)
                });

            } else {
                endpoints.getSentEmails(currentStartDate, startEndDate).then(function(resp1) {
                    console.log(resp1);
                    sentEmails = resp1;
                    fillInLabelTranslations(sentEmails.fieldLabels);

                    // Query products table to get product name
                    endpoints.getProducts(getProductIdsFromSentEmail()).then(function(resp2) {
                        console.log(resp2);
                        var products = resp2.data;

                        angular.forEach(sentEmails.data, function(sentEmail) {
                            if(sentEmail.Product_vod__c) {
                                var foundProduct = _.find(products, function(product) {
                                    return product.Id && product.Id.value === sentEmail.Product_vod__c.value;
                                });

                                if(foundProduct) {
                                    sentEmail.productName = foundProduct.Name;
                                }
                            }
                        });
                        deferred.resolve({
                            success: true,
                            data: sentEmails.data
                        });
                    });
                }, function(error) {
                    deferred.reject({
                        success: false,
                        message: error
                    });
                });
            }

            return deferred.promise;
        };

        sentEmailService.getStartDate = function() {
            return currentStartDate;
        };

        sentEmailService.getEndDate = function() {
            return startEndDate;
        };

        sentEmailService.getFixedStartDate = function() {
            return fixedStartDate;
        };

        sentEmailService.getFixedEndDate = function() {
            return fixedEndDate;
        };

        sentEmailService.getSentEmailsForProductId = function(productId) {
            var result = sentEmails.data;

            if(productId) {
                result = _.filter(sentEmails.data, function(sentEmail) {
                    return sentEmail.Product_vod__c && sentEmail.Product_vod__c.value === productId;
                });
            }

            return result;
        };

        function filterSentEmailsByDateRange(date1, date2) {
            var result = _.filter(sentEmails.data, function(sentEmail) {
                if(sentEmail.Email_Sent_Date_vod__c && angular.isDate(sentEmail.Email_Sent_Date_vod__c.value)) {
                    return sentEmail.Email_Sent_Date_vod__c.value.valueOf() >= date1.valueOf() && sentEmail.Email_Sent_Date_vod__c.value.valueOf() <= date2.valueOf();
                } else {
                    return false;
                }
            });

            return result;
        }

        function getProductIdsFromSentEmail() {
            var productIds = [];

            angular.forEach(sentEmails.data, function(sentEmail) {
                if(sentEmail.Product_vod__c) {
                    productIds.push(sentEmail.Product_vod__c.value);
                }
            });

            return productIds;
        }

        function fillInLabelTranslations(fieldLabels) {
            var labelMap = _.indexBy(fieldLabels, 'name');
            if(labelMap.Opened_vod__c) {
                labelService.setTranslation('openPercentage', '% ' + labelMap.Opened_vod__c.display);
                labelService.setTranslation('opened', labelMap.Opened_vod__c.display);
            }
        }

        return sentEmailService;
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('territoryService', ['$q', 'endpoints', factoryFn]);

    function factoryFn($q, endpoints) {
        var territoryService = this;
        var territories = {};
        var userTerritories = {};
        var veevaUtil = new VeevaUtilities();

        territoryService.fetchAllTerritories = function() {
            var deferred = $q.defer();

            if(territories.data) {
                var _territories = veevaUtil.deepCopy(territories);
                deferred.resolve(_territories);
            } else {
                endpoints.getAllTerritories().then(function(resp) {
                    console.log(resp);
                    territories = resp;
                    deferred.resolve(territories);
                });
            }

            return deferred.promise;
        };

        territoryService.fetchUserTerritories = function(userId) {
            var deferred = $q.defer();

            if(userTerritories.data) {
                var _userTerritories = veevaUtil.deepCopy(userTerritories);
                deferred.resolve(_userTerritories);

            } else if(angular.isString(userId)) {
                endpoints.getUserTerritories(userId).then(function(resp) {
                    console.log(resp);
                    userTerritories = resp;
                    deferred.resolve(userTerritories);
                });
            }

            return deferred.promise;
        };

        territoryService.getAllTerritories = function() {
            var _territoriesData = veevaUtil.deepCopy(territories.data);
            return _territoriesData || [];
        };

        territoryService.getUserTerritories = function() {
            var _userTerritoriesData = veevaUtil.deepCopy(userTerritories.data);
            return _userTerritoriesData || [];
        };

        territoryService.getUserTerritoryIds = function() {
            var ids = [];
            angular.forEach(userTerritories.data, function(uTerritory) {
                ids.push(uTerritory.TerritoryId.value);
            });
            return ids;
        };

        return territoryService;
    }
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .factory('userService', ['$q', 'endpoints', factoryFn]);

    function factoryFn($q, endpoints) {
        var userService = this;
        var currentUser = null;

        userService.fetchCurrentUser = function() {
            var deferred = $q.defer();

            if(!currentUser) {
                endpoints.getCurrentUser().then(function(resp) {
                    console.log(resp);
                    currentUser = {};

                    if(resp.data && resp.data[0]) {
                        var rawUserData = resp.data[0];
                        for(var key in rawUserData) {
                            currentUser[key] = rawUserData[key].value;
                        }
                    }
                    deferred.resolve(currentUser);
                });

            } else {
                deferred.resolve(currentUser);
            }

            return deferred.promise;
        };

        userService.getCurrentUser = function() {
            return currentUser;
        };

        return userService;
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .directive('accountDetailFilter', directiveFn);

    function directiveFn() {
        var controller = ['$scope', function($scope) {
            var filter = this;

            // data collection
            filter.frequencies = [];

            // data model
            filter.selectedFrequency = null;

            // Filter option change handler
            filter.frequencyUpdate = function() {
                $scope.frequencyUpdate({
                    frequency: filter.selectedFrequency
                });
            };

            function populateFrequencyFilterDropdown() {
                var frequencyList = $scope.getFrequencyList();

                if(angular.isArray(frequencyList)) {
                    angular.forEach(frequencyList, function(frequency) {
                        filter.frequencies.push({
                            value: frequency,
                            display: frequency + ' Frequency'
                        });
                    });
                }

                filter.frequencies.unshift({
                    display: 'All Frequency'
                });

                if(angular.isDefined($scope.preSelectedFrequency)) {
                    var preSelectedFrequencyFilter = _.find(filter.frequencies, function(frequency) {
                        return frequency.value === $scope.preSelectedFrequency;
                    });

                    if(preSelectedFrequencyFilter) {
                        filter.selectedFrequency = preSelectedFrequencyFilter;
                    } else {
                        filter.selectedFrequency = filter.frequencies[0];
                    }
                } else {
                    filter.selectedFrequency = filter.frequencies[0];
                }

                filter.frequencyUpdate();
            }

            populateFrequencyFilterDropdown();
        }];

        return {
            templateUrl: 'views/account-detail-filter.html',
            restrict: 'E',
            scope: {
                frequencyUpdate: '&',
                getFrequencyList: '&',
                preSelectedFrequency: '='
            },
            controller: controller,
            controllerAs: 'filter'
        };
    }
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .directive('barChart', directiveFn);

    function directiveFn() {
        var link = function(scope, element) {
            if(!scope.width) {
                scope.width = '100%';
            }
            element.css({
                width: scope.width
            });

            var chartData = {
                labels: scope.labels,
                datasets: []
            };

            var chartOptions = {
                responsive: false,
                scales: {
                    xAxes: [{
                        gridLines: {
                            display: false
                        },
                        stacked: true
                    }],
                    yAxes: [{
                        ticks: {
                            max: 50,
                            min: 0,
                            stepSize: 10,
                            callback: function(value) {
                                return value < 50 ?  value : '50+';
                            }
                        },
                        gridLines: {
                            color: 'rgba(236,239,241,1)',
                            tickMarkLength: 0
                        },
                        stacked: true
                    }]
                },
                legend: false,
                events: []
            };

            var gradient = element[0].getContext("2d").createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, '#008fd2');
            gradient.addColorStop(1, '#5ac8fa');

            function formatData(data) {
                return _.map(data, function(num) {
                    if(num > 50) {
                        return 50;
                    }
                    return num;
                });
            }

            // Add dynamic data
            if(scope.data && scope.data[1]) {
                chartData.datasets.unshift({
                    type: 'bar',
                    backgroundColor: gradient,
                    data: formatData(scope.data[1])
                });
            }
            if(scope.data && scope.data[0]) {
                chartData.datasets.unshift({
                    type: 'line',
                    fill: false,
                    borderColor: 'rgba(207,219,0,1)',
                    pointStyle: 'line',
                    data: formatData(scope.data[0])
                });
            }

            var ctx = document.getElementById("barChart");
            var barChart = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: chartOptions
            });

            scope.$on('updateBarChart', function() {
                barChart.data.labels = scope.labels;
                barChart.data.datasets[0].data = formatData(scope.data[0]);
                barChart.data.datasets[1].data = formatData(scope.data[1]);
                barChart.update();
            });
        };

        return {
            template: '<canvas id="barChart"></canvas>',
            restrict: 'E',
            replace: true,
            scope: {
                data: '=',
                labels: '=',
                width: '@'
            },
            link: link
        };
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .directive('callActivityFilter', directiveFn);

    function directiveFn() {
        var controller = ['$scope', 'accountService', 'callService', 'territoryService', 'productService', 'reportUtil', 'filterType', 'messageService', 'labelService',
            function($scope, accountService, callService, territoryService, productService, reportUtil, filterType, messageService, labelService) {
                var filter = this;
                var labels = labelService.labels;

                function initialize() {
                    // data collection
                    filter.territories = [];
                    filter.callStatus = [];
                    filter.mySetupProducts = [];
                    filter.callTypes = [];

                    filter.callPlannedNum = 0;
                    filter.callSubmittedNum = 0;
                    filter.callSavedNum = 0;

                    // data model
                    filter.startDate = callService.getStartDate();
                    filter.endDate = callService.getEndDate();
                    filter.fixedStartDate = callService.getFixedStartDate();
                    filter.fixedEndDate = callService.getFixedEndDate();
                    filter.selectedTerritory = null;
                    filter.selectedCallStatus = null;
                    filter.selectedMySetupProduct = null;
                    filter.selectedCallType = null;

                    // filter record
                    filter.filterRecords = {};

                    getTerritories();
                    getCallStatus(callService.getCalls());
                    getMySetupProducts();
                    getCallTypes(callService.getCalls());
                }

                /**
                 *  Local functions
                 */
                filter.processDateRangeUpdate = function(startDate, endDate) {
                    callService.fetchCallData(startDate, endDate).then(function(resp) {
                        filter.filterRecords[filterType.dateRangePicker.value] = resp.data;

                        $scope.callDataUpdate({
                            calls: applyAllFilterOnCalls()
                        });
                    });
                };

                filter.territoryUpdate = function() {
                    if(filter.selectedTerritory) {
                        if(filter.selectedTerritory.Id) {
                            accountService.fetchAccountForTerritory([filter.selectedTerritory.Id.value]).then(function(resp) {
                                $scope.accountDataUpdate({
                                    accounts: resp.data
                                });
                            });
                        } else {
                            $scope.accountDataUpdate({
                                accounts: accountService.getAllAccounts()
                            });
                        }
                    }
                };

                filter.productUpdate = function() {
                    var productId = null;
                    if(filter.selectedMySetupProduct.Product_vod__c) {
                        productId = filter.selectedMySetupProduct.Product_vod__c.value;
                    }

                    callService.getCallsForProductId(productId).then(function(calls) {
                        filter.filterRecords[filterType.product.value] = calls;

                        $scope.callDataUpdate({
                            calls: applyAllFilterOnCalls()
                        });
                    });
                };

                filter.callStatusUpdate = function() {
                    var calls = callService.getCalls();
                    var result = [];

                    if(!filter.selectedCallStatus.value) {
                        result = calls;
                    } else {
                        result = filterList(calls, 'Status_vod__c', filter.selectedCallStatus.value);
                    }
                    filter.filterRecords[filterType.callStatus.value] = result;

                    $scope.callDataUpdate({
                        calls: applyAllFilterOnCalls()
                    });
                };

                filter.callTypeUpdate = function() {
                    var calls = callService.getCalls();
                    var result = [];

                    if(!filter.selectedCallType.value) {
                        result = calls;
                    } else {
                        result = filterList(calls, 'Call_Type_vod__c', filter.selectedCallType.value);
                    }
                    filter.filterRecords[filterType.callType.value] = result;

                    $scope.callDataUpdate({
                        calls: applyAllFilterOnCalls()
                    });
                };

                /**
                 *  Private functions
                 */
                function getTerritories() {
                    var userTerritories = territoryService.getUserTerritories();
                    var allTerritories = territoryService.getAllTerritories();
                    var territories = [];

                    angular.forEach(userTerritories, function(uTerritory) {
                        if(uTerritory.TerritoryId) {
                            var userTerritoryId = uTerritory.TerritoryId.value;
                            var foundTerritory = _.find(allTerritories, function(territory) {
                                return territory.Id && territory.Id.value === userTerritoryId;
                            });

                            if(foundTerritory) {
                                territories.push(foundTerritory);
                            }
                        }
                    });

                    territories = reportUtil.sortByValue(territories, 'Name');
                    territories.unshift({
                        Name: {
                            display: messageService.getMessage('territory') + ' (' + messageService.getMessage('all') + ')'
                        }
                    });

                    filter.territories = territories;
                    filter.selectedTerritory = filter.territories[0];
                }

                function getMySetupProducts() {
                    var mySetupProducts = productService.getMySetupProducts();
                    mySetupProducts = reportUtil.sortByValue(mySetupProducts, 'productName');
                    mySetupProducts.unshift({
                        productName: {
                            display: messageService.getMessage('product') + ' (' + messageService.getMessage('all') + ')'
                        }
                    });

                    filter.mySetupProducts = mySetupProducts;
                    filter.selectedMySetupProduct = filter.mySetupProducts[0];
                }

                function getCallStatus(calls) {
                    var callStatus = [];
                    var tracker = {};

                    angular.forEach(calls, function(aCall) {
                        if(aCall.Status_vod__c && !tracker[aCall.Status_vod__c.value]) {
                            callStatus.push(aCall.Status_vod__c);
                            tracker[aCall.Status_vod__c.value] = true;
                        }
                    });

                    callStatus = reportUtil.sortByValue(callStatus);
                    callStatus.unshift({
                        display: labels.callStatus.display + ' (' + messageService.getMessage('all') + ')'
                    });

                    filter.callStatus = callStatus;
                    filter.selectedCallStatus = filter.callStatus[0];
                }

                function getCallTypes(calls) {
                    var callTypes = [];
                    var tracker = {};

                    angular.forEach(calls, function(aCall) {
                        if(aCall.Call_Type_vod__c && !tracker[aCall.Call_Type_vod__c.value]) {
                            callTypes.push(aCall.Call_Type_vod__c);
                            tracker[aCall.Call_Type_vod__c.value] = true;
                        }
                    });

                    callTypes = reportUtil.sortByValue(callTypes);
                    callTypes.unshift({
                        display: labels.callType.display + ' (' + messageService.getMessage('all') + ')'
                    });

                    filter.callTypes = callTypes;
                    filter.selectedCallType = filter.callTypes[0];
                }

                function filterList(list, key, compareValue) {
                    return _.filter(list, function(aObject) {
                        if(aObject[key]) {
                            return aObject[key].value === compareValue;
                        }
                    });
                }

                function applyAllFilterOnCalls() {
                    var rollOverCallsRecord = [];
                    var skip = false;
                    var iteration = 1;

                    angular.forEach(filter.filterRecords, function(currentCallsRecord) {
                        if(angular.isArray(currentCallsRecord) && !skip) {
                            // If one of the filter result is empty, skip the rest(final result will be empty)
                            if(currentCallsRecord.length === 0) {
                                rollOverCallsRecord = [];
                                skip = true;

                            } else if(iteration === 1) {
                                rollOverCallsRecord = currentCallsRecord;

                            } else {
                                rollOverCallsRecord = reportUtil.findCommonItems(rollOverCallsRecord, currentCallsRecord, 'Id');
                            }
                        }
                        iteration += 1;
                    });

                    return rollOverCallsRecord;
                }

                initialize();
            }];

        return {
            templateUrl: 'views/call-activity-filter.html',
            restrict: 'E',
            scope: {
                callDataUpdate: '&',
                accountDataUpdate: '&'
            },
            controller: controller,
            controllerAs: 'filter'
        };
    }
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .directive('dateRangePicker', directiveFn);

    function directiveFn() {
        var controller = ['$scope', function($scope) {
            var picker = this;

            // data model
            picker.date1 = $scope.startDate;
            picker.date2 = $scope.endDate;

            // date picker options
            picker.datePicker1Options = {
                maxDate: picker.date2,
                minDate: $scope.fixedStartDate,
                maxMode: 'month',
                showWeeks: false
            };
            picker.datePicker2Options = {
                maxDate: $scope.fixedEndDate,
                minDate: picker.date1,
                maxMode: 'month',
                showWeeks: false
            };
            picker.datePickerOpened = {
                picker1: false,
                picker2: false
            };

            picker.openDatePicker1 = function() {
                picker.datePickerOpened.picker1 = true;
            };

            picker.openDatePicker2 = function() {
                picker.datePickerOpened.picker2 = true;
            };

            picker.datePickerUpdate1 = function() {
                // Update the min date on date picker 2
                picker.datePicker2Options.minDate = picker.date1;

                $scope.processDateRangeUpdate({
                    startDate: picker.date1,
                    endDate: picker.date2
                });
            };

            picker.datePickerUpdate2 = function() {
                // Update the max date on date picker 1
                picker.datePicker1Options.maxDate = picker.date2;

                $scope.processDateRangeUpdate({
                    startDate: picker.date1,
                    endDate: picker.date2
                });
            };
        }];

        return {
            templateUrl: 'views/date-range-picker.html',
            restrict: 'E',
            replace: true,
            scope: {
                startDate: '=',
                endDate: '=',
                fixedStartDate: '=',
                fixedEndDate: '=',
                processDateRangeUpdate: '&'
            },
            controller: controller,
            controllerAs: 'picker'
        };
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .directive('doughnutChart', directiveFn);

    function directiveFn() {
        return {
            template: '<canvas></canvas>',
            restrict: 'E',
            replace: true,
            scope: {
                color1: '@',
                color2: '@',
                data1: '=',
                data2: '='
            },
            link: function(scope, element, attrs) {
                var gradient = element[0].getContext("2d").createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, scope.color1);
                gradient.addColorStop(1, scope.color2);

                var data = {
                    datasets: [{
                        data: [formatData().data1, formatData().data2],
                        backgroundColor: [
                            gradient,
                            "#e0e0e0"
                        ]
                    }]
                };

                var options = {
                    cutoutPercentage: 80,
                    responsive: false,
                    events: [],
                    customLabel: calculatePercentage() + '%',
                    customLabelColor: '#666666'
                };

                /**
                 * Chart global config
                 */
                var centerLabelPlugin = {
                    beforeDraw: function(chart) {
                        if(chart.config.type === 'doughnut') {
                            var width = chart.chart.width;
                            var height = chart.chart.height;
                            var ctx = chart.chart.ctx;

                            ctx.restore();
                            var fontSize = (height / 70).toFixed(2);
                            ctx.font = fontSize + "em sans-serif";
                            ctx.textBaseline = "middle";

                            if(chart.config.options.customLabelColor) {
                                ctx.fillStyle = chart.config.options.customLabelColor;
                            }

                            var text = chart.config.options.customLabel;
                            var textX = Math.round((width - ctx.measureText(text).width) / 2);
                            var textY = height / 2;

                            ctx.fillText(text, textX, textY);
                            ctx.save();
                        }
                    }
                };
                Chart.pluginService.register(centerLabelPlugin);

                console.log('Doughnut data: ' + scope.data1 + ',' + scope.data2);

                var doughnutChart = new Chart(element, {
                    type: 'doughnut',
                    data: data,
                    options: options
                });

                scope.$on('updateDoughnutChart', function() {
                    console.log('Doughnut data: ' + scope.data1 + ',' + scope.data2);

                    doughnutChart.data.datasets[0].data = [formatData().data1, formatData().data2];
                    doughnutChart.options.customLabel = calculatePercentage() + '%';
                    doughnutChart.update();
                });

                // Format data to make sure the doughnut chart looks correct
                function formatData() {
                    var data1 = scope.data1;
                    var data2 = scope.data2;

                    // Avoid case that the doughnut will be gone if the second data is 0. i.e. 0/0
                    if(data1 === 0 && data2 === 0) {
                        data2 = 1;
                    } else {
                        data1 = data1/data2;
                        data2 = (data2-scope.data1)/data2;
                    }

                    return {
                        data1: data1,
                        data2: data2
                    };
                }

                function calculatePercentage() {
                    var num1 = scope.data1;
                    var num2 = scope.data2;

                    if(num2 === 0) {
                        return 0;
                    } else {
                        return Math.floor(100* num1/num2);
                    }
                }
            }
        };
    }
})();
(function() {
    'use strict';

    angular.module('territoryApp')
        .directive('reportTable', directiveFn);

    function directiveFn() {
        var linker = function(scope, element) {
            if(!scope.width) {
                scope.width = '100%';
            }
            element.css({
                width: scope.width
            });
        };

        var controller = ['$scope', 'labelService', function($scope, labelService) {
            var table = this;
            var ds = window.ds;

            table.labels = labelService.labels;

            if($scope.columnSortable) {
                table.columnSorted = $scope.headers[0].value;
                table.orderKey = table.columnSorted;
            }

            table.rowClicked = function(index) {
                if(angular.isFunction($scope.rowClickHandler())) {
                    $scope.rowClickHandler()(index);
                } else {
                    console.log('No row click handler registered.');
                }
            };

            table.sortColumn = function(columnName) {
                if($scope.columnSortable) {
                    table.columnSorted = columnName;

                    if(table.orderKey === table.columnSorted) {
                        table.orderKey = '-' + table.columnSorted;
                    } else {
                        table.orderKey = table.columnSorted;
                    }

                    console.log('Sorting column based on key: ' + table.orderKey);
                }
            };

            table.filterFunction = function(row) {
                if(angular.isFunction($scope.customFilterFunction())) {
                    return $scope.customFilterFunction()(row);
                } else {
                    return true;
                }
            };

            table.applySortingIcon = function() {
                if(angular.isString(table.orderKey) && table.orderKey[0] === '-') {
                    return 'fa-caret-down';
                } else {
                    return 'fa-caret-up';
                }
            };

            table.fieldClicked = function (headerValue, item) {
                var config = {};
                if (headerValue === table.labels.accountName.value) {
                    config.object = 'Account';
                    config.fields = {
                        Id: item.accountId
                    };
                    ds.viewRecord(config);
                }
            }
        }];

        return {
            templateUrl: 'views/report-table.html',
            restrict: 'E',
            replace: true,
            scope: {
                headers: '=',
                data: '=',
                width: '@',
                clickable: '@',
                columnSortable: '@',
                customFilterFunction: '&',
                rowClickHandler: '&'
            },
            link: linker,
            controller: controller,
            controllerAs: 'table'
        };
    }
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .controller('CallActivityController', ['$scope', '$timeout', '$q', 'userService', 'accountService', 'callService', 'callDetailService',
            'callSampleService', 'territoryService', 'productService', 'reportUtil', 'messageService', 'labelService', CallActivityController]);

    function CallActivityController($scope, $timeout, $q, userService, accountService, callService, callDetailService,
                                    callSampleService, territoryService, productService, reportUtil, messageService, labelService) {
        var call = this;
        var veevaUtil = new window.VeevaUtilities();

        // Data models
        call.calls = [];
        call.callDetails = [];
        call.callSamples = [];
        call.accounts = [];

        // Section toggle flag
        call.mainDataReady = false;
        call.allReady = false;
        call.mainView = true;

        // Chart data storage
        call.frequencyChart = [{
            name: messageService.getMessage('daily'),
            labels: null,
            data: null
        }, {
            name: messageService.getMessage('weekly'),
            labels: null,
            data: null
        }];
        call.frequencyChartMode = 0;

        // Static data
        var maxCallFrequency = 4;
        var currentUser = userService.getCurrentUser();
        var labels = labelService.labels;

        // Promises
        var callDataDeferred = $q.defer();
        var accountDataDeferred = $q.defer();
        var callDetailDataDeferred = $q.defer();
        var callSampleDataDeferred = $q.defer();
        var mySetupProductDataDeferred = $q.defer();

        var mainDataPromises = [
            callDataDeferred.promise,
            accountDataDeferred.promise
        ];
        var allPromises = [
            callDataDeferred.promise,
            accountDataDeferred.promise,
            callDetailDataDeferred.promise,
            callSampleDataDeferred.promise,
            mySetupProductDataDeferred.promise
        ];

        $scope.$emit('reportLanded');

        // Initiate chart & table data
        initiateProductFrequencyTableData();
        initiateCallFrequencyTableData();
        initiateAccountFrequencyTableData();
        initiateAccountDetailTableData();

        callService.fetchCallData().then(function(resp) {
            call.calls = resp.data;
            callDataDeferred.resolve();
        }, function(resp) {
            callDataDeferred.reject(resp);
        });

        territoryService.fetchAllTerritories().then(function() {
            territoryService.fetchUserTerritories(currentUser.Id).then(function() {
                var userTerritoryIds = territoryService.getUserTerritoryIds();
                accountService.fetchAccountForTerritory(userTerritoryIds).then(function(resp) {
                    call.accounts = resp.data;
                    accountDataDeferred.resolve();
                });
            });
        });

        productService.fetchMySetupProducts().then(function() {
            mySetupProductDataDeferred.resolve();
        });

        $q.all(mainDataPromises).then(function() {
            var callIds = getCallIdsFromCallsForFilteredAccount();
            getCallDetails(callIds).then(function() {
                callDetailDataDeferred.resolve();
                updateProductFrequencyTableData();
                updateAccountDetailData(true);
            });

            getCallSamples(callIds).then(function() {
                callSampleDataDeferred.resolve();
            });

            updateDailyFrequencyChartData();
            updateWeeklyFrequencyChartData();
            updateCallFrequencyTableData();

            call.mainDataReady = true;
        });

        $q.all(allPromises).then(function() {
            updateAccountFrequencyData();
            call.allReady = true;
        });

        call.callDataUpdate = function(calls) {
            call.calls = calls;
            getCallDetails(getCallIdsFromCallsForFilteredAccount()).then(function() {
                updateProductFrequencyTableData();
                updateAccountDetailData(true);
            });

            updateDailyFrequencyChartData();
            updateWeeklyFrequencyChartData();
            updateCallFrequencyTableData();
            updateAccountFrequencyData();

            $timeout(function() {
                $scope.$broadcast('updateDoughnutChart');
                $scope.$broadcast('updateBarChart');
            });
        };

        call.accountDataUpdate = function(accounts) {
            call.accounts = accounts;
            getCallDetails(getCallIdsFromCallsForFilteredAccount()).then(function() {
                updateProductFrequencyTableData();
                updateAccountDetailData(true);
            });

            updateDailyFrequencyChartData();
            updateWeeklyFrequencyChartData();
            updateCallFrequencyTableData();
            updateAccountFrequencyData();

            $timeout(function() {
                $scope.$broadcast('updateDoughnutChart');
                $scope.$broadcast('updateBarChart');
            });
        };

        call.getDoughnutStyle = function() {
            return {
                width: '120px',
                height: '120px',
                display: 'inline-block'
            };
        };

        call.countAllAccounts = function() {
            return call.accounts.length;
        };

        call.countAccountsWithCall = function() {
            return _.size(_.filter(groupCallsByFilteredAccount(), function(calls) {
                return calls.length > 0;
            }));
        };

        call.getAverageCallPerAccount = function() {
            var accountWithCall = call.countAccountsWithCall();
            if(accountWithCall === 0) {
                return 0;
            }

            var totalCall = _.reduce(groupCallsByFilteredAccount(),function(memo, calls) {
                return memo + calls.length;
            }, 0);

            return Math.round(10*totalCall/accountWithCall)/10;
        };

        // Emma
        call.getCallTotal = function() {
            var plannedVocCount = groupCallsByStatus();
            return plannedVocCount.total;
        };

        call.getAverageCallDetailPerAccount = function() {
            var callAccountCount = call.countAccountsWithCall();
            var callDetailCount = _.size(call.callDetails);

            if(callAccountCount === 0) {
                return 0;
            } else {
                return Math.round(10* callDetailCount / callAccountCount) / 10;
            }
        };

        call.goToAccountDetailView = function(rowNumber) {
            if(rowNumber >= maxCallFrequency) {
                call.preSelectedFrequency = rowNumber + '+';
            } else {
                call.preSelectedFrequency = rowNumber;
            }

            call.mainView = false;
            $scope.$emit('goToDetailNavigation', 'Accounts');
        };

        call.getCallFrequencyList = function() {
            var callsByFilteredAccount = groupCallsByFilteredAccount();
            var callFrequencyList = [];
            var tracker = {};

            angular.forEach(callsByFilteredAccount, function(calls) {
                var callCount = calls.length;
                if(callCount >= maxCallFrequency) {
                    callCount = maxCallFrequency + '+';
                }
                if(!tracker[callCount]) {
                    callFrequencyList.push(callCount);
                    tracker[callCount] = true;
                }
            });

            return _.sortBy(callFrequencyList, function(frequency) {
                return parseInt(frequency);
            });
        };

        call.callFrequencyUpdate = function(frequency) {
            if(angular.isDefined(frequency.value)) {
                call.accountDetailTable.filter.frequency = frequency.value;
            } else {
                call.accountDetailTable.filter.frequency = null;
            }
        };

        call.accountDetailTableFilter = function(row) {
            if(angular.isNumber(call.accountDetailTable.filter.frequency)) {
                return row[labels.calls.value] === call.accountDetailTable.filter.frequency;

            } else if(angular.isString(call.accountDetailTable.filter.frequency)) {
                // Group accounts together for call frequency equal or larger than the maxCallFrequency
                if(call.accountDetailTable.filter.frequency === maxCallFrequency + '+') {
                    return row[labels.calls.value] >= maxCallFrequency;
                }
            }

            return true;
        };

        call.switchFrequencyChart = function(index) {
            call.frequencyChartMode = index;

            $timeout(function() {
                $scope.$broadcast('updateBarChart');
            });
        };

        $scope.$on('goToMainNavigation', function() {
            call.mainView = true;
        });

        /**
         *  Private functions
         */
        function getCallDetails(callIds) {
            var deferred = $q.defer();

            callDetailService.fetchCallDetailData(callIds).then(function(resp) {
                call.callDetails = resp.data;
                deferred.resolve();
            });

            return deferred.promise;
        }

        function getCallSamples(callIds) {
            var deferred = $q.defer();

            callSampleService.fetchCallSampleData(callIds).then(function(resp) {
                call.callSamples = resp.data;
                deferred.resolve();
            });

            return deferred.promise;
        }

        function initiateProductFrequencyTableData() {
            call.productFrequencyTable = {
                headers: [labels.product, labels.calls],
                data: []
            };
        }

        function initiateCallFrequencyTableData() {
            call.callFrequencyTable = {
                headers: [labels.frequency, labels.accountCount, labels.accountPercentage],
                data: []
            };
        }

        function initiateAccountFrequencyTableData() {
            call.topAccountTable = {
                headers: [labels.accountName, labels.calls, labels.samplePercentage, labels.clmPercentage],
                data: []
            };

            call.leastAccountTable = {
                headers: [labels.accountName, labels.calls, labels.samplePercentage, labels.clmPercentage],
                data: []
            };
        }

        function initiateAccountDetailTableData() {
            call.accountDetailTable = {
                headers: [labels.accountName, labels.calls, labels.samplePercentage, labels.samples, labels.clmPercentage, labels.avgDetails],
                data: [],
                filter: {}
            };
        }

        function updateProductFrequencyTableData() {
            var newData = [];
            var callDetailsByProductId = groupCallDetailsByProductId();

            angular.forEach(callDetailsByProductId, function(cDetails) {
                if(angular.isArray(cDetails) && cDetails[0].productName) {
                    var row = {};
                    row[labels.product.value] = cDetails[0].productName.display;
                    row[labels.calls.value] = cDetails.length;
                    newData.push(row);
                }
            });

            // Only include 3 products with the most call
            newData = _.sortBy(newData, function(row) {
                return row[labels.calls.value] * -1;
            });

            var maxProduct = 3;
            if(newData.length >= maxProduct) {
                call.productFrequencyTable.data = newData.slice(0, maxProduct);
            } else {
                call.productFrequencyTable.data = newData;
            }
        }

        function updateDailyFrequencyChartData() {
            var calls = getCallsFromFilteredAccount();

            // call.calls
            // var totalDays = reportUtil.countDaysInBetween(callService.getStartDate(), callService.getEndDate());
            // call.avgCallsPerDay = totalDays === 0 ? 0 : Math.round(10 * calls.length / totalDays)/10;

            // var calls = [];
            // var callDataDeferred = $q.defer();
            // callService.fetchCallData().then(function(resp) {
            //     calls = resp.data;
            //     callDataDeferred.resolve();
            // }, function(resp) {
            //     callDataDeferred.reject(resp);
            // });
            // var calls = groupCallsByStatus();
            // calls = call.calls;
            // Status_vod__c
            var newChartData = reportUtil.generateDailyFrequencyChartData(calls, 'Call_Date_vod__c', call.avgCallsPerDay);
            call.frequencyChart[0] = _.extendOwn(call.frequencyChart[0], newChartData);
        }

        function updateWeeklyFrequencyChartData() {
            var calls = getCallsFromFilteredAccount();

            // var totalDays = reportUtil.countDaysInBetween(callService.getStartDate(), callService.getEndDate());
            // call.avgCallsPerDay = totalDays === 0 ? 0 : Math.round(10 * calls.length / totalDays)/10;

            var newChartData = reportUtil.generateWeeklyFrequencyChartData(call.calls, 'Call_Date_vod__c', call.avgCallsPerDay);
            call.frequencyChart[1] = _.extendOwn(call.frequencyChart[1], newChartData);
        }

        function updateCallFrequencyTableData() {
            var callsByFilteredAccount = groupCallsByFilteredAccount();
            var accountIdsByCallFrequency = groupAccountIdsByCallFrequency(callsByFilteredAccount);
            var newData = [];

            for(var i = 0; i <= maxCallFrequency; i++) {
                var row = {};
                var callFrequency = i;
                var accountCount = 0;
                var accountPercentage = 0;

                // Count account together if it has maxCallFrequency of calls or more
                if(callFrequency >= maxCallFrequency) {
                    angular.forEach(callsByFilteredAccount, function(calls) {
                        if(calls.length >= maxCallFrequency) {
                            accountCount += 1;
                        }
                    });
                    callFrequency = maxCallFrequency + '+';
                } else {
                    accountCount = _.size(accountIdsByCallFrequency[callFrequency]);
                }

                if(call.accounts.length > 0) {
                    accountPercentage = Math.floor((accountCount/call.accounts.length) * 100);
                }

                row[labels.frequency.value] = callFrequency;
                row[labels.accountCount.value] = accountCount;
                row[labels.accountPercentage.value] = accountPercentage + '%';
                newData.push(row);
            }

            call.callFrequencyTable.data = newData;
        }

        function updateAccountFrequencyData() {
            var callsByFilteredAccount = groupCallsByFilteredAccount();
            var sortedCallsByFrequency = _.sortBy(callsByFilteredAccount, function(calls) {
                return calls.length * -1;
            });
            // Skip account with no call
            sortedCallsByFrequency = _.filter(sortedCallsByFrequency, function(calls) {
                return calls.length > 0;
            });

            var walker = 0;
            var maxRowsPerTable = 3;
            var newTopAccountData = [];

            for(var i = 0; i < maxRowsPerTable && sortedCallsByFrequency[i]; i++) {
                // Since list 'sortedCallsByFrequency' is comes from object 'callsByFilteredAccount', which means
                // each call data within the sub-array will belong to the same account, so we only need to look
                // at the first data [0] from each sub-array to obtain the account info:
                if(sortedCallsByFrequency[i][0].Account_vod__c) {
                    var accountId = sortedCallsByFrequency[i][0].Account_vod__c.value;
                    var account = _.find(call.accounts, function(account) {
                        return account.Id.value === accountId;
                    });
                    var accountName = reportUtil.formatAccountName(account);
                    var callCount = sortedCallsByFrequency[i].length;
                    var samplePercentage = calculateSamplePercentage(callCount, accountId);
                    var clmPercentage = calculateClmPercentageFromCalls(sortedCallsByFrequency[i]);
                    var row = {};

                    row[labels.accountId.value] = accountId;
                    row[labels.accountName.value] = accountName;
                    row[labels.calls.value] = callCount;
                    row[labels.samplePercentage.value] = samplePercentage + '%';
                    row[labels.clmPercentage.value] = clmPercentage + '%';
                    newTopAccountData.push(row);

                    walker += 1;
                }
            }

            var leastFrequencyFromTopAccount;
            if(sortedCallsByFrequency[walker - 1]) {
                leastFrequencyFromTopAccount = sortedCallsByFrequency[walker - 1].length;
            }
            var lastIndex = sortedCallsByFrequency.length - 1;
            var newLeastAccountData = [];

            // Starting to get accounts from the end of the sorted list(account with least frequency)
            if(lastIndex >= walker) {
                for(var i = 0; i < maxRowsPerTable && (lastIndex - i) >= walker; i++) {
                    // Skip filling the call data if the call frequency count equals to the least frequency count from the top account data
                    var callCount = sortedCallsByFrequency[lastIndex - i].length;
                    if(callCount === leastFrequencyFromTopAccount) {
                        break;
                    }

                    if(sortedCallsByFrequency[lastIndex - i][0].Account_vod__c) {
                        var accountId = sortedCallsByFrequency[lastIndex - i][0].Account_vod__c.value;
                        var account = _.find(call.accounts, function(account) {
                            return account.Id.value === accountId;
                        });
                        var accountName = reportUtil.formatAccountName(account);
                        var samplePercentage = calculateSamplePercentage(callCount, accountId);
                        var clmPercentage = calculateClmPercentageFromCalls(sortedCallsByFrequency[lastIndex - i]);
                        var row = {};

                        row[labels.accountId.value] = accountId;
                        row[labels.accountName.value] = accountName;
                        row[labels.calls.value] = callCount;
                        row[labels.samplePercentage.value] = samplePercentage + '%';
                        row[labels.clmPercentage.value] = clmPercentage + '%';
                        newLeastAccountData.push(row);
                    }
                }
            }

            call.topAccountTable.data = newTopAccountData;
            call.leastAccountTable.data = newLeastAccountData;
        }

        function updateAccountDetailData(callDataRefreshed) {
            var accountDetailData = [];
            var callsByFilteredAccount = groupCallsByFilteredAccount();

            angular.forEach(callsByFilteredAccount, function(calls, accountId) {
                var row = {};

                // Re-calculate call related data
                if(callDataRefreshed) {
                    var callDetailsByCallId = groupCallDetailsByCallId();
                    var totalCallDetails = 0;
                    var avgDetails = 0;

                    angular.forEach(calls, function(aCall) {
                        if(aCall.Id && angular.isArray(callDetailsByCallId[aCall.Id.value])) {
                            totalCallDetails += callDetailsByCallId[aCall.Id.value].length;
                        }
                    });

                    if(calls.length > 0) {
                        avgDetails = Math.round(10 * totalCallDetails / calls.length) / 10;
                    }

                    row[labels.calls.value] = calls.length;
                    row[labels.samplePercentage.value] = calculateSamplePercentage(calls.length, accountId) + '%';
                    row[labels.samples.value] = countCallSamples(accountId, calls);
                    row[labels.clmPercentage.value] = calculateClmPercentageFromCalls(calls) + '%';
                    row[labels.avgDetails.value] = avgDetails;
                }
                // get call related data from the existed table data
                else {
                    var existedRow = _.find(call.accountDetailTable.data, function(tableRow) {
                        return tableRow[labels.accountId.value] === accountId;
                    });

                    if(existedRow) {
                        row[labels.calls.value] = existedRow[labels.calls.value];
                        row[labels.samplePercentage.value] = existedRow[labels.samplePercentage.value];
                        row[labels.samples.value] = existedRow[labels.samples.value];
                        row[labels.clmPercentage.value] = existedRow[labels.clmPercentage.value];
                        row[labels.avgDetails.value] = existedRow[labels.avgDetails.value];
                    }
                }

                var account = _.find(call.accounts, function(account) {
                    return account.Id.value === accountId;
                });
                row[labels.accountId.value] = accountId;
                row[labels.accountName.value] = reportUtil.formatAccountName(account);
                accountDetailData.push(row);
            });

            call.accountDetailTable.data = accountDetailData;
        }

        /**
         * Group calls by account.
         * Calls might be filtered by the date range picker.
         * @returns {Object|*}
         */
        function groupCallsByAccount() {
            return _.groupBy(call.calls, function(aCall) {
                if(aCall.Account_vod__c) {
                    return aCall.Account_vod__c.value;
                }
            });
        }

        /**
         * Emma
         * group calls by status
         */
        function groupCallsByStatus() {
            var planVocArray = call.calls || [];
            var voc = {planned:0, submitted:0, saved:0, total:0,};
            angular.forEach(planVocArray, function(cDetail) {
                if(cDetail.Status_vod__c === 'Planned_vod') {
                    voc.planned += 1;
                } else if (cDetail.Status_vod__c === 'Submitted_vod') {
                    voc.submitted += 1;
                } else if(cDetail.Status_vod__c === 'Saved_vod') {
                    voc.saved += 1;
                }
                voc.total += 1;
            });

            return voc;
        }

        /**
         * Group calls by filtered account.
         * Build on top of groupCallsByAccount().
         * Accounts might be filtered by the territory filter. This method will also add in accounts with 0 call
         * @returns {{}}
         */
        function groupCallsByFilteredAccount() {
            var callsByAccount = groupCallsByAccount();
            var callsByFilteredAccount = {};

            angular.forEach(call.accounts, function(account) {
                if(account.Id) {
                    var accountId = account.Id.value;
                    if(callsByAccount[accountId]) {
                        callsByFilteredAccount[accountId] = callsByAccount[accountId];
                    } else {
                        callsByFilteredAccount[accountId] = [];
                    }
                }
            });

            return callsByFilteredAccount;
        }

        /**
         * Group call details by product id.
         * @returns {Object|*}
         */
        function groupCallDetailsByProductId() {
            return _.groupBy(call.callDetails, function(cDetail) {
                if(cDetail.Product_vod__c) {
                    return cDetail.Product_vod__c.value;
                }
            });
        }

        /**
         * Group call details by call id.
         * @returns {Object|*}
         */
        function groupCallDetailsByCallId() {
            return _.groupBy(call.callDetails, function(cDetail) {
                return cDetail.Call2_vod__c.value;
            });
        }

        /**
         * Group account ids by call frequency(number)
         * @param callsByAccount - a map return from groupCallsByAccount()
         * @returns {{}}
         */
        function groupAccountIdsByCallFrequency(callsByAccount) {
            var accountIdsByCallFrequency = {};

            angular.forEach(callsByAccount, function(calls, accountId) {
                var callFrequency = calls.length;
                if(!accountIdsByCallFrequency[callFrequency]) {
                    accountIdsByCallFrequency[callFrequency] = [];
                }
                accountIdsByCallFrequency[callFrequency].push(accountId);
            });

            return accountIdsByCallFrequency;
        }


        /**
         * determine whether a date is in range
         * @param targetDate
         * @param startDate
         * @param endDate
         * @returns {boolean}
         */
        function isInRange(targetDate, startDate, endDate) {
            return targetDate.valueOf() >= startDate && targetDate.valueOf() <= endDate;
        }

        /**
         * Count call sample based on the given account id and filtered calls
         * @param accountId
         * @param inRangeCalls
         * @returns {number}
         */
        function countCallSamples(accountId, inRangeCalls) {
            var sampleCount = 0;

            if (inRangeCalls.length > 0) {
                // count sample
                _.forEach(inRangeCalls, function(singleCall){
                    _.forEach(call.callSamples, function(sample){
                        if (sample.Account_vod__c && sample.Account_vod__c.value === accountId && sample.Call2_vod__c.value === singleCall.Id.value){
                            sampleCount += parseFloat(sample.Quantity_vod__c.value);
                        }
                    })
                });

            }

            return sampleCount;
        }

        /**
         * Calculate the percentage of Sample call
         * @param callCount
         * @param accountId
         * @returns {number}
         */
        function calculateSamplePercentage(callCount, accountId) {
            if (callCount === 0) {
                return 0;
            }

            var accountIndexedCalls = groupCallsByAccount();
            var counter = 0;

            var callIndexedCallSamples = _.groupBy(call.callSamples, function(cSample) {
                if(cSample.Call2_vod__c) {
                    return cSample.Call2_vod__c.value;
                }
            });

            if (accountIndexedCalls[accountId]) {
                _.forEach(accountIndexedCalls[accountId], function(call){
                    if (callIndexedCallSamples[call.Id.value] && callIndexedCallSamples[call.Id.value].length > 0){
                        counter += 1;
                    }

                });

                // to prevent js floating problem: parseFloat((57/100).toFixed(2))*100 === 56.99999999999999
                return Math.round(parseFloat((counter / callCount).toFixed(2)) * 100);
            }else {
                return 0;
            }
        }

        /**
         * Calculate the percentage of CLM calls from a given list of call objects
         * @param calls - a list of call object
         * @returns {number}
         */
        function calculateClmPercentageFromCalls(calls) {
            var totalCalls = calls.length;
            var clmCount = 0;

            angular.forEach(calls, function(aCall) {
                if(veevaUtil.isWin8()) {
                    if(angular.isString(aCall.CLM_vod__c.value) && aCall.CLM_vod__c.value.toLowerCase() === 'true') {
                        clmCount += 1;
                    }
                } else if(aCall.CLM_vod__c.value) {
                    clmCount += 1;
                }
            });

            if(totalCalls === 0) {
                return 0;
            } else {
                return Math.round(100 * clmCount / totalCalls);
            }
        }

        /**
         * Extract a list of call ids from all the calls under current filtered account
         * @returns {Array} - An array of call ids
         */
        function getCallIdsFromCallsForFilteredAccount() {
            var callIds = [];
            var callsByFilteredAccount = groupCallsByFilteredAccount();

            angular.forEach(callsByFilteredAccount, function(calls) {
                if(calls.length > 0) {
                    angular.forEach(calls, function(aCall) {
                        if(aCall.Id) {
                            callIds.push(aCall.Id.value);
                        }
                    });
                }
            });

            return callIds;
        }

        /**
         * Extract a list of calls from all the calls under current filtered account
         * @returns {Array} - An array of calls
         */
        function getCallsFromFilteredAccount() {
            var calls = [];
            var callsByFilteredAccount = groupCallsByFilteredAccount();

            angular.forEach(callsByFilteredAccount, function(theCalls) {
                if(theCalls.length > 0) {
                    angular.forEach(theCalls, function(aCall) {
                        calls.push(aCall);
                    });
                }
            });

            return calls;
        }
    }
})();

(function() {
    'use strict';

    angular.module('territoryApp')
        .controller('MainCtrl', ['$scope', '$location', 'sentEmailService', MainCtrl]);

    function MainCtrl($scope, $location, sentEmailService) {
        var main = this;
        var reports = [{
            name: 'callActivity'
        }];
        var accessibleReports = [];

        // When user access the report from home
        if($location.path() === '') {
            // Check for FLS on sent email object
            sentEmailService.fetchSentEmailData().then(function() {
                initiateReport();
            }, function() {
                // Remove AE report if the query to sent email object failed(missing certain FLS)
                reports.pop();
                initiateReport();
            });
        }
        // When user access the report by refreshing the current page(for Dev use)
        else {
            var currentReportName = $location.path().replace('/', '');
            initiateReport(currentReportName);
        }

        main.mainNavigation = true;

        main.getAccessibleReports = function() {
            return accessibleReports;
        };

        main.applyActiveStyle = function(index) {
            if(main.activeReport.name === accessibleReports[index].name) {
                return 'active';
            }
        };

        main.switchReport = function(index) {
            main.activeReport = accessibleReports[index];
            $location.path('/' + main.activeReport.name);
        };

        main.goToMainNavigation = function() {
            main.mainNavigation = true;
            $scope.$broadcast('goToMainNavigation');
        };

        $scope.$on('goToDetailNavigation', function(event, data) {
            main.detailViewTitle = data;
            main.mainNavigation = false;
        });

        $scope.$on('reportLanded', function() {
            main.reportLanded = true;
        });

        function initiateReport(name) {
            if(reports.length) {
                accessibleReports = reports;

                if(name) {
                    var foundActiveReport = _.find(accessibleReports, function(report) {
                        return report.name === name;
                    });
                    if(foundActiveReport) {
                        main.activeReport = foundActiveReport;
                    } else {
                        main.activeReport = accessibleReports[0];
                    }
                } else {
                    main.activeReport = accessibleReports[0];
                }

                $location.path('/' + main.activeReport.name);
            }
        }
    }
})();


angular.module('territoryApp').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('views/account-detail-filter.html',
    "<div class=\"filter-section\">\n" +
    "    <div class=\"filterable-item\">\n" +
    "        <select ng-options=\"frequency.display for frequency in filter.frequencies track by frequency.value\" ng-model=\"filter.selectedFrequency\"\n" +
    "                ng-change=\"filter.frequencyUpdate()\"></select>\n" +
    "        <span class=\"icon fa fa-angle-down\"></span>\n" +
    "    </div>\n" +
    "</div>"
  );

  $templateCache.put('views/bar-chart.html',
    "<canvas id=\"barChart\"></canvas>"
  );


  $templateCache.put('views/call-activity-filter.html',
    "<div class=\"filter-section section-container\">\n" +
    "    <div class=\"filterable-item\">\n" +
    "        <date-range-picker start-date=\"filter.startDate\" end-date=\"filter.endDate\"\n" +
    "                           fixed-start-date=\"filter.fixedStartDate\" fixed-end-date=\"filter.fixedEndDate\"\n" +
    "                           process-date-range-update=\"filter.processDateRangeUpdate(startDate, endDate)\"></date-range-picker>\n" +
    "        <span class=\"icon fa fa-angle-down\"></span>\n" +
    "    </div>\n" +
    "    <div class=\"filterable-item\">\n" +
    "        <select ng-options=\"territory.Name.display for territory in filter.territories\" ng-model=\"filter.selectedTerritory\"\n" +
    "                ng-change=\"filter.territoryUpdate()\"></select>\n" +
    "        <span class=\"icon fa fa-angle-down\"></span>\n" +
    "    </div>\n" +
    "    <div class=\"filterable-item\">\n" +
    "        <select ng-options=\"mySetupProduct.productName.display for mySetupProduct in filter.mySetupProducts\" ng-model=\"filter.selectedMySetupProduct\"\n" +
    "                ng-change=\"filter.productUpdate()\"></select>\n" +
    "        <span class=\"icon fa fa-angle-down\"></span>\n" +
    "    </div>\n" +
    "    <div class=\"filterable-item\">\n" +
    "        <select ng-options=\"status.display for status in filter.callStatus\" ng-model=\"filter.selectedCallStatus\"\n" +
    "                ng-change=\"filter.callStatusUpdate()\"></select>\n" +
    "        <span class=\"icon fa fa-angle-down\"></span>\n" +
    "    </div>\n" +
    "    <div class=\"filterable-item\">\n" +
    "        <select ng-options=\"type.display for type in filter.callTypes\" ng-model=\"filter.selectedCallType\"\n" +
    "                ng-change=\"filter.callTypeUpdate()\"></select>\n" +
    "        <span class=\"icon fa fa-angle-down\"></span>\n" +
    "    </div>\n" +
    "</div>"
  );


  $templateCache.put('views/call-activity.html',
    "<div ng-show=\"call.mainView\">\n" +
    "    <call-activity-filter ng-if=\"call.allReady\" call-data-update=\"call.callDataUpdate(calls)\" account-data-update=\"call.accountDataUpdate(accounts)\"></call-activity-filter>\n" +
    "\n" +
    "    <div class=\"call-summary-section-1\">\n" +
    "        <div class=\"table structure-table\">\n" +
    "            <div class=\"cell half section-container\">\n" +
    "                <div class=\"section-title\">{{'reach' | message}}</div>\n" +
    "                <div class=\"section-body inline-block-container\" ng-if=\"call.mainDataReady\">\n" +
    // "                    <div class=\"align-top\">\n" +
    // "                        <doughnut-chart ng-style=\"call.getDoughnutStyle()\" color1=\"#ff5575\" color2=\"#8b123a\"\n" +
    // "                                        data1=\"call.countAccountsWithCall()\" data2=\"call.countAllAccounts()\"></doughnut-chart>\n" +
    // "                        <div>{{'reach' | message}}</div>\n" +
    // "                    </div>\n" +
    "                    <div class=\"align-top\">\n" +
    "                        <div class=\"summarize-digit\">{{call.getCallTotal()}}</div>\n" +
    "                        <div>Total Calls</div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    // "            <div class=\"cell half section-container\">\n" +
    // "                <div class=\"section-title\">{{'frequency' | message}}</div>\n" +
    // "                <div class=\"section-body inline-block-container\" ng-if=\"call.mainDataReady\">\n" +
    // "                    <div class=\"align-top\">\n" +
    // "                        <div class=\"summarize-digit\">{{call.getAverageCallDetailPerAccount()}}</div>\n" +
    // "                        <div>{{'avgDetailsHcp' | message}}</div>\n" +
    // "                    </div>\n" +
    // // "                    <div class=\"align-top\">\n" +
    // // "                        <report-table headers=\"call.productFrequencyTable.headers\" data=\"call.productFrequencyTable.data\"></report-table>\n" +
    // // "                    </div>\n" +
    // "                </div>\n" +
    // "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    "    <div class=\"call-summary-section-2\">\n" +
    "        <div class=\"section-container\">\n" +
    "            <div class=\"section-title\">{{'callFrequencyTrend' | message}}</div>\n" +
    "            <div class=\"section-body\" ng-if=\"call.mainDataReady\">\n" +
    "                <div class=\"table structure-table\">\n" +
    "                    <div class=\"cell half align-top\">\n" +
    "                        <div class=\"chart-info-block-top\">\n" +
    "                            <div>{{call.avgCallsPerDay}}</div>\n" +
    "                            <div>{{'avgCallsDay' | message}}</div>\n" +
    "                        </div>\n" +
    "                        <bar-chart data=\"call.frequencyChart[call.frequencyChartMode].data\" labels=\"call.frequencyChart[call.frequencyChartMode].labels\"></bar-chart>\n" +
    // "                        <div class=\"chart-info-block-bottom\">\n" +
    // "                            <div class=\"chart-controller inline-block-container\">\n" +
    // "                                <div class=\"chart-toggle\" ng-class=\"{active:call.frequencyChartMode === $index}\" ng-repeat=\"chart in call.frequencyChart\"\n" +
    // "                                     ng-click=\"call.switchFrequencyChart($index)\">{{chart.name}}</div>\n" +
    // "                            </div>\n" +
    // "                            <div class=\"chart-legend\">\n" +
    // "                                <span class=\"chart-legend-item\">\n" +
    // "                                    <hr><span>{{'avgCallsDay' | message}}</span>\n" +
    // "                                </span>\n" +
    // "                                <span class=\"chart-legend-item\">\n" +
    // "                                    <i class=\"fa fa-square\"></i><span>{{'calls' | message}}</span>\n" +
    // "                                </span>\n" +
    // "                            </div>\n" +
    // "                        </div>\n" +
    // "                    </div>\n" +
    // "                    <div class=\"cell half align-top\">\n" +
    // "                        <report-table headers=\"call.callFrequencyTable.headers\" data=\"call.callFrequencyTable.data\"\n" +
    // "                                      clickable=\"true\" row-click-handler=\"call.goToAccountDetailView\"></report-table>\n" +
    // "                    </div>\n" +
    "                </div>\n" +
    "            </div>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "\n" +
    // "    <div class=\"call-summary-section-3\">\n" +
    // "        <div class=\"table structure-table\">\n" +
    // "            <div class=\"cell half section-container\">\n" +
    // "                <div class=\"section-title\">{{'mostFrequentActs' | message}}</div>\n" +
    // "                <div class=\"section-body no-padding\" ng-if=\"call.mainDataReady\">\n" +
    // "                    <report-table class=\"no-border\" headers=\"call.topAccountTable.headers\" data=\"call.topAccountTable.data\"></report-table>\n" +
    // "                </div>\n" +
    // "            </div>\n" +
    // "            <div class=\"cell half section-container\">\n" +
    // "                <div class=\"section-title\">{{'leastFrequentActs' | message}}</div>\n" +
    // "                <div class=\"section-body no-padding\" ng-if=\"call.mainDataReady\">\n" +
    // "                    <report-table class=\"no-border\" headers=\"call.leastAccountTable.headers\" data=\"call.leastAccountTable.data\"></report-table>\n" +
    // "                </div>\n" +
    // "            </div>\n" +
    // "        </div>\n" +
    // "    </div>\n" +
    "</div>\n" +
    "\n" +
    "<div ng-if=\"!call.mainView\">\n" +
    "    <account-detail-filter get-frequency-list=\"call.getCallFrequencyList()\" pre-selected-frequency=\"call.preSelectedFrequency\" frequency-update=\"call.callFrequencyUpdate(frequency)\"></account-detail-filter>\n" +
    "    <div class=\"call-summary-section-4\">\n" +
    "        <div class=\"section-container\">\n" +
    "            <report-table headers=\"call.accountDetailTable.headers\" data=\"call.accountDetailTable.data\"\n" +
    "                          column-sortable=\"true\" custom-filter-function=\"call.accountDetailTableFilter\"></report-table>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n"
  );


  $templateCache.put('views/date-range-picker.html',
    "<div class=\"date-range-picker\">\n" +
    "    <input type=\"text\" uib-datepicker-popup=\"MM/dd/yyyy\" ng-model=\"picker.date1\" datepicker-options=\"picker.datePicker1Options\"\n" +
    "           is-open=\"picker.datePickerOpened.picker1\" ng-click=\"picker.openDatePicker1()\" ng-change=\"picker.datePickerUpdate1()\"\n" +
    "           show-button-bar=\"false\" readonly=\"readonly\"/>\n" +
    "    <span>-</span>\n" +
    "    <input type=\"text\" uib-datepicker-popup=\"MM/dd/yyyy\" ng-model=\"picker.date2\" datepicker-options=\"picker.datePicker2Options\"\n" +
    "           is-open=\"picker.datePickerOpened.picker2\" ng-click=\"picker.openDatePicker2()\" ng-change=\"picker.datePickerUpdate2()\"\n" +
    "           show-button-bar=\"false\" readonly=\"readonly\"/>\n" +
    "</div>\n"
  );


  $templateCache.put('views/report-table.html',
    "<div class=\"table report-table\">\n" +
    "    <div class=\"title row\">\n" +
    "        <div class=\"cell\" ng-repeat=\"header in headers\" ng-click=\"table.sortColumn(header.value)\">\n" +
    "            <span>{{header.display}}</span>\n" +
    "            <span class=\"fa\" ng-class=\"table.applySortingIcon()\" ng-if=\"columnSortable\" ng-hide=\"table.columnSorted !== header.value\"></span>\n" +
    "        </div>\n" +
    "        <div class=\"cell\" ng-if=\"clickable\"></div>\n" +
    "    </div>\n" +
    "    <div class=\"body row\" ng-class=\"{'odd-row': $odd, clickable: clickable}\" ng-repeat=\"item in data | filter: table.filterFunction | customFilter: table.orderKey\"\n" +
    "         ng-click=\"table.rowClicked($index)\">\n" +
    "        <div class=\"cell\" ng-repeat=\"header in headers\"\n" +
    "             ng-click=\"table.fieldClicked(header.value, item)\"\n" +
    "             ng-class=\"{'clickable-account-name': header.value === table.labels.accountName.value}\">{{item[header.value]}}</div>\n" +
    "        <div class=\"cell\" ng-if=\"clickable\">\n" +
    "            <span class=\"icon fa fa-angle-right\"></span>\n" +
    "        </div>\n" +
    "    </div>\n" +
    "</div>\n"
  );

}]);
