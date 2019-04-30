/*
Veeva MyInsights Library version ${version}

http://developer.veevacrm.com/

Copyright © 2017 Veeva Systems, Inc. All rights reserved.

My Insights Library is dependent on the Q library, which enables you to work with promises as returns from the My Insights Library methods.
Include the Q library as a script in the custom report package.
Q Library License Acknolegements
Copyright 2009-2017 Kristopher Michael Kowal. All rights reserved.
Q library can be downloaded here https://github.com/kriskowal/q/blob/v1/LICENSE
*/
(function () {
    'use strict';
    window.VeevaUtilities = function () {
        var veevaUtil = this;

        veevaUtil.isWin8 = function () {
            return navigator.platform.toLowerCase().indexOf('win') >= 0;
        };

        veevaUtil.isOnline = function () {
            var host = window.location.hostname;
            var onlineRETest = /cdnhtml/gi;
            return onlineRETest.test(host);
        };

        veevaUtil.addMessageListener = function (callback) {
            if (window.addEventListener) {
                window.addEventListener('message', callback, false);
            } else {
                window.attachEvent('onmessage', callback);
            }
            return callback;
        };

        veevaUtil.removeMessageListener = function (callback) {
            if (window.removeEventListener) {
              window.removeEventListener('message', callback, false);
            }
            else {
              window.detachEvent('onmessage', callback);
            }
        };

        veevaUtil.mergeObjects = function (dst, src, clobber) {
            for (var k in src) {
                if (src.hasOwnProperty(k) && ((!clobber && !dst[k]) || clobber)) {
                    dst[k] = src[k];
                }
            }
            return dst;
        };

        veevaUtil.copyObject = function (obj) {
            return JSON.parse(JSON.stringify(obj));
        };

        veevaUtil.deepCopy = function (originalObject) {
            if(originalObject === null || typeof(originalObject) !== 'object') {
                return originalObject;
            }

            var clonedObject;
            if(originalObject instanceof Date) {
                clonedObject = new Date(originalObject);
            } else {
                clonedObject = originalObject.constructor();
            }

            for(var key in originalObject) {
                // Ignore inherited properties
                if(Object.prototype.hasOwnProperty.call(originalObject, key)) {
                    //TODO: worse case O(2^n), any better?
                    clonedObject[key] = veevaUtil.deepCopy(originalObject[key]);
                }
            }

            return clonedObject;
        };

        veevaUtil.replaceStringInWhereClause = function (whereClause, input, stringToBeReplaced) {
            var result = '', i;
            var indices = getIndicesOf(stringToBeReplaced, whereClause);

            if (indices.length === 0) {
                return whereClause;
            }

            for (i = 0; i < indices.length; i+=1) {

                if (i === 0) {
                    result += whereClause.slice(0, indices[0]);
                }else {
                    result += whereClause.slice((indices[i - 1] + stringToBeReplaced.length), indices[i]);
                }

                result = result + "'" + input + "'";
            }

            result += whereClause.slice((indices[indices.length - 1] + stringToBeReplaced.length));

            return result;
        };

        function getIndicesOf(searchStr, str, caseSensitive) {
            var searchStrLen = searchStr.length;
            var startIndex = 0, index, indices = [];

            if (searchStrLen === 0) {
                return [];
            }

            if (!caseSensitive) {
                str = str.toLowerCase();
                searchStr = searchStr.toLowerCase();
            }

            while ((index = str.indexOf(searchStr, startIndex)) > -1) {
                indices.push(index);
                startIndex = index + searchStrLen;
            }

            return indices;
        }
    };
})();

(function (Q) {
    'use strict';
    window.OnlineAPI = function () {
        var olAPI = this;
        var listenerQueue = {};
        var veevaUtil = new window.VeevaUtilities();
        var translationsCache = {};
        var queries = {
            translations: {
                object: 'Message_vod__c',
                fields: ['Name', 'Category_vod__c', 'Language_vod__c', 'Text_vod__c'],
                where: ''
            }
        };
        var errorCode = {
            GENERIC: 0,
            NO_PARAMETER: 2
        };

        function queryListener(message) {
            var data;
            if (typeof message.data === 'string') {
                try {
                    data = JSON.parse(message.data);
                }
                catch (e) {
                    data = {data: {}};
                }
            }
            if (data.command === 'queryReturn') {
                if (listenerQueue[data.deferredId]) {
                    listenerQueue[data.deferredId].resolve(data);
                    delete listenerQueue[data.deferredId];

                    if(~data.deferredId.indexOf('callback_queued_')) {
                        olAPI.queryRunning = false;
                        olAPI.checkQueryQueue();
                    }
                }
                else {
                    console.warn('deferred object not found', data);
                }
            }
            else if (data.command === 'error') {
                if(listenerQueue[data.deferredId]) {
                    listenerQueue[data.deferredId].reject(data);
                    delete listenerQueue[data.deferredId];

                    if(~data.deferredId.indexOf('callback_queued_')) {
                        olAPI.queryRunning = false;
                        olAPI.checkQueryQueue();
                    }
                }
            }
            else {
                console.warn('unknown command', message);
            }
        }

        function addMessageListener(callback) {
            if (window.addEventListener) {
                window.addEventListener('message', callback, false);
            }
            else {
                window.attachEvent('onmessage', callback);
            }
        }

        function postMessage(message) {
            window.parent.postMessage(JSON.stringify(message), '*');
        }

        function delegateOnlineRequest(queryConfig, deferredId, deferred, respHandler) {
            olAPI.queryRunning = true;
            listenerQueue[deferredId] = deferred;

            // When optional callback function is given:
            if(typeof respHandler === 'function') {
                var interDeferred = Q.defer();
                listenerQueue[deferredId] = interDeferred;
                interDeferred.promise.then(function(resp) {
                    respHandler(resp, deferred);
                });
            }

            postMessage(queryConfig);
        }

        function onlineErrorResponse(code, message) {
            var customErrorObject = {};
            customErrorObject.success = false;
            customErrorObject.code = code;
            customErrorObject.message = message;
            return customErrorObject;
        }

        /**
         * Wrapper function for the legacy online queryRecord function
         */
        function queryRecord(object, fields, where, sort, limit) {
            var deferred = Q.defer();
            var deferredId = 'callback_' + (+new Date());
            var queryConfig = {
                command: 'queryObject',
                object: object,
                fields: fields,
                where: where,
                sort: sort,
                limit: limit,
                deferredId: deferredId
            };
            listenerQueue[deferredId] = deferred;
            postMessage(queryConfig);
            return deferred.promise;
        }

        olAPI.genericQueryErrorHandler = function (e) {
            var errors = e.error;
            var i = errors.length;
            while (i--) {
                errors[i] = {
                    message: errors[i].message,
                    error: errors[i].errorCode
                };
            }
            console.log(e);
        };

        olAPI.queryRecord = function (queryObject) {
            if(arguments.length > 1) {
                // Fallback method for legacy queryRecord
                return queryRecord.apply(olAPI, arguments);
            }

            var deferred = Q.defer();

            if (olAPI.queryRunning) {
                olAPI.queriesQueue.push({
                    config: queryObject,
                    deferred: deferred,
                    type: 'queryRecord_ol'
                });
            } else {
                var deferredId = 'callback_queued_' + (+new Date());
                var queryConfig = {
                    command: 'queryObject',
                    object: queryObject.object,
                    fields: queryObject.fields,
                    where: queryObject.where,
                    sort: queryObject.sort,
                    limit: queryObject.limit,
                    deferredId: deferredId
                };
                delegateOnlineRequest(queryConfig, deferredId, deferred);
            }

            return deferred.promise;
        };

        olAPI.querySalesData = function(queryObject) {
            var deferred = Q.defer();

            if(olAPI.queryRunning) {
                olAPI.queriesQueue.push({
                    config: queryObject,
                    deferred: deferred,
                    type: 'querySalesData_ol'
                });
            } else {
                var deferredId = 'callback_queued_' + (+new Date());
                var queryConfig = {
                    command: 'querySalesData',
                    object: queryObject.object,
                    fields: queryObject.fields,
                    where: queryObject.where,
                    sort: queryObject.sort,
                    limit: queryObject.limit,
                    deferredId: deferredId
                };
                delegateOnlineRequest(queryConfig, deferredId, deferred);
            }

            return deferred.promise;
        };

        olAPI.query = function (queryConfig) {
            var deferred = Q.defer();
            var deferredId = 'callback_' + Math.random().toString(36).substring(2); // (+new Date());
            queryConfig.deferredId = deferredId;
            listenerQueue[deferredId] = deferred;
            postMessage(queryConfig);

            return deferred.promise;
        };

        olAPI.getDataForCurrentObject = function (object, field) {
            var deferred = Q.defer();

            if(olAPI.queryRunning) {
                olAPI.queriesQueue.push({
                    object: object,
                    field: field,
                    deferred: deferred,
                    type: 'getDataForCurrentObject_ol'
                });
            } else {
                var deferredId = 'callback_queued_' + (+new Date());
                var newConfig = {
                    command: 'getDataForObjectV2',
                    object: object,
                    fields: [field],
                    deferredId: deferredId
                };
                delegateOnlineRequest(newConfig, deferredId, deferred);
            }

            return deferred.promise;
        };

        olAPI.getObjectLabels = function (objects) {
            var deferred = Q.defer();

            if(olAPI.queryRunning) {
                olAPI.queriesQueue.push({
                    config: objects,
                    deferred: deferred,
                    type: 'getObjectLabels_ol'
                });
            } else {
                var deferredId = 'callback_queued_' + (+new Date());
                var newConfig = {
                    command: 'getObjectLabels',
                    object: objects,
                    deferredId: deferredId
                };
                delegateOnlineRequest(newConfig, deferredId, deferred);
            }

            return deferred.promise;
        };

        olAPI.getFieldLabels = function (queryConfig) {
            var deferred = Q.defer();
            var object = queryConfig.object;
            var fields = queryConfig.fields;

            var respHandler = function(resp, deferred) {
                var labels = resp[object];
                var i = fields.length;
                var newLabels = [];
                while (i--) {
                    newLabels.unshift({
                        name: fields[i],
                        display: labels[fields[i]]
                    });
                }
                deferred.resolve(newLabels);
            };

            if(olAPI.queryRunning) {
                olAPI.queriesQueue.push({
                    config: queryConfig,
                    deferred: deferred,
                    type: 'getFieldLabels_ol'
                });
            } else {
                var deferredId = 'callback_queued_' + (+new Date());
                var newConfig = {
                    command: 'getFieldLabel',
                    object: object,
                    fields: fields,
                    deferredId: deferredId
                };
                delegateOnlineRequest(newConfig, deferredId, deferred, respHandler);
            }

            return deferred.promise;
        };

        olAPI.getTranslation = function (tokens, localeKey) {
            var deferred = Q.defer();
            var config = veevaUtil.copyObject(queries.translations);
            var whereSubClauses = [];
            var index = tokens.length;
            var cachedResponses = [];
            var cache = translationsCache;
            while (index--) {
                if (!cache[tokens[index].msgName + ':' + tokens[index].msgCategory]) {
                    whereSubClauses.push("(Name='" + tokens[index].msgName + "' AND Category_vod__c='" + tokens[index].msgCategory + "')");
                }
                else {
                    cachedResponses.push(cache[tokens[index].msgName + ':' + tokens[index].msgCategory]);
                }
            }
            config.where += "(" + whereSubClauses.join(" OR ") + ")" + " AND Language_vod__c='" + localeKey + "'";
            // if all the responses were in the cache, then this will be empty and we just return the cached responses.
            if (whereSubClauses.length) {
                olAPI
                    .queryRecord(config.object, config.fields, config.where)
                    .then(function (resp) {
                        var data = resp[config.object],
                            d = data.length;
                        deferred.resolve(data.concat(cachedResponses));
                        while (d--) {
                            if (!cache[data[d].Name.value + ':' + data[d].Category_vod__c.value]) {
                                cache[data[d].Name.value + ':' + data[d].Category_vod__c.value] = data[d];
                            }
                        }
                    });
            }
            else {
                deferred.resolve(cachedResponses);
            }
            return deferred.promise;
        };

        olAPI.getPicklistValueLabels = function (object, field) {
            var deferred = Q.defer();

            if(olAPI.queryRunning) {
                olAPI.queriesQueue.push({
                    object: object,
                    field: field,
                    deferred: deferred,
                    type: 'getPicklistValueLabels_ol'
                });
            } else {
                var deferredId = 'callback_queued_' + (+new Date());
                var newConfig = {
                    command: 'getPicklistValueLabels',
                    object: object,
                    field: field,
                    deferredId: deferredId
                };
                delegateOnlineRequest(newConfig, deferredId, deferred);
            }

            return deferred.promise;
        };

        olAPI.newRecord = function(configObject) {
            var deferred = Q.defer();
            if(typeof configObject === 'object') {
                var messageBody = {};
                messageBody.command = 'newRecord';
                messageBody.configObject = configObject;
                postMessage(messageBody);
            }
            return deferred.promise;
        };

        olAPI.viewRecord = function(configObject) {
            var deferred = Q.defer();
            if(typeof configObject === 'object') {
                var messageBody = {};
                messageBody.command = 'viewRecord';
                messageBody.configObject = configObject;
                postMessage(messageBody);
            }
            return deferred.promise;
        };

        olAPI.smartLinking = function(configObject) {
            var deferred = Q.defer();

            if (olAPI.queryRunning) {
                olAPI.queriesQueue.push({
                    config: configObject,
                    deferred: deferred,
                    type: 'smartLinking_ol'
                });
            } else {
                var deferredId = 'callback_queued_' + (+new Date());
                var queryConfig = {
                    command: 'smartLinking',
                    configObject: configObject,
                    deferredId: deferredId
                };
                delegateOnlineRequest(queryConfig, deferredId, deferred);
            }

            return deferred.promise;
        };

        olAPI.getAvailableObjects = function() {
            var deferred = Q.defer();

            if (olAPI.queryRunning) {
                olAPI.queriesQueue.push({
                    deferred: deferred,
                    type: 'getAvailableObjects_ol'
                });
            } else {
                var deferredId = 'callback_queued_' + (+new Date());
                var queryConfig = {
                    command: 'getAvailableObjects',
                    deferredId: deferredId
                };

                delegateOnlineRequest(queryConfig, deferredId, deferred);
            }

            return deferred.promise;
        };

        olAPI.getObjectMetadata = function(queryObject) {
            var deferred = Q.defer();

            if(queryObject && queryObject.object) {
                if (olAPI.queryRunning) {
                    olAPI.queriesQueue.push({
                        config: queryObject,
                        deferred: deferred,
                        type: 'getObjectMetadata_ol'
                    });
                } else {
                    var deferredId = 'callback_queued_' + (+new Date());
                    var queryConfig = {
                        command: 'getObjectMetadata',
                        object: queryObject.object,
                        deferredId: deferredId
                    };

                    delegateOnlineRequest(queryConfig, deferredId, deferred);
                }
            } else {
                deferred.reject(onlineErrorResponse(errorCode.NO_PARAMETER, "getObjectMetadata called with no parameter"));
            }

            return deferred.promise;
        };

        olAPI.getRecordTypeLabels = function(objectName) {
            var deferred = Q.defer();

            if(objectName) {
                if (olAPI.queryRunning) {
                    olAPI.queriesQueue.push({
                        config: objectName,
                        deferred: deferred,
                        type: 'getRecordTypeLabels_ol'
                    });
                } else {
                    var deferredId = 'callback_queued_' + (+new Date());
                    var queryConfig = {
                        command: 'getRecordTypeLabels',
                        object: objectName,
                        deferredId: deferredId
                    };

                    delegateOnlineRequest(queryConfig, deferredId, deferred);
                }
            } else {
                deferred.reject(onlineErrorResponse(errorCode.NO_PARAMETER, "getRecordTypeLabels called with no parameter"));
            }

            return deferred.promise;
        };

        addMessageListener(queryListener);
    };
})(window.Q);

(function (Q) {
    'use strict';

    var DataService = function () {
        var ds = this;
        ds.queriesQueue = [];
        ds.queryRunning = false;

        var veevaUtil = new window.VeevaUtilities();
        var queries = {
            translations: {
                object: 'Message_vod__c',
                fields: ['Name', 'Category_vod__c', 'Language_vod__c', 'Text_vod__c'],
                where: ''
            }
        };
        var dateRE = /date/i;
        var urlRE = /_url_/i;
        var translationsCache = {};
        var ISO_DATE_REGEX = /[0-9]{4}-[0-9]{2}-[0-9]{2}(T|\s)[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{1,3}Z/;
        var VALID_DATE_FORMAT_REGEX = /[0-9]{4}.[0-9]{2}.[0-9]{2}(.[0-9]{2})?(.[0-9]{2})?(.[0-9]{2})?(.[0-9]{1,3})?[zZ]?/;

        function genericQueryErrorHandler(deferred) {
            return function(error) {
                deferred.reject(error);
            };
        }

        function isISODateFormat(inputString) {
            return ISO_DATE_REGEX.test(inputString);
        }

        function isValidDateFormat(inputString) {
            return VALID_DATE_FORMAT_REGEX.test(inputString);
        }

        function normalizeTimeDigits(digitInString) {
            return digitInString ? parseInt(digitInString, 10) : 0;
        }

        function extractDateStringToNumbers(inputString) {
            var parts = inputString.match(/(\d+)/g);

            return {
                year: normalizeTimeDigits(parts[0]),
                month: normalizeTimeDigits(parts[1]) - 1,
                date: normalizeTimeDigits(parts[2]),
                hours: normalizeTimeDigits(parts[3]),
                minutes: normalizeTimeDigits(parts[4]),
                seconds: normalizeTimeDigits(parts[5]),
                ms: normalizeTimeDigits(parts[6])
            };
        }

        function parseDate(input) {
            var extractedDigits;

            if (isISODateFormat(input)) {
                return new Date(input);
            }else {
                extractedDigits = extractDateStringToNumbers(input);

                return new Date(
                    extractedDigits.year, extractedDigits.month, extractedDigits.date,
                    extractedDigits.hours, extractedDigits.minutes, extractedDigits.seconds,
                    extractedDigits.ms
                );
            }
        }

        function getCRMDate(dateString) {
            var newDate;

            if (isISODateFormat(dateString) || isValidDateFormat(dateString)) {
                newDate = parseDate(dateString);
            }

            if (!newDate) {
                console.warn('bad date: ', dateString, newDate);
            }

            return newDate;
        }

        function getResultSet(query) {
            for (var k in query) {
                if (query.hasOwnProperty(k) && k !== 'success' && k !== 'record_count' && k !== 'fieldLabels' && k !== 'object') {
                    var object = query.object;
                    var result = {
                        data: query[k],
                        object: object,
                        name: k,
                        fieldLabels: query.fieldLabels
                    };
                    var data = result.data;
                    var urlTrimProtocolRE = /^(http|https):\/\//i;
                    var urlTrimDubRE = /www\./i;
                    var fieldLabels = query.fieldLabels;

                    result.object.name = k;

                    for (var i = data.length; i--;) {
                        for (var d in data[i]) {
                            if (data[i].hasOwnProperty(d)) { // d is the key of the data point
                                if (dateRE.test(d)) { // this is a date field
                                    var tempDate = data[i][d];
                                    var realDate = getCRMDate(tempDate);
                                    if (realDate) {
                                        data[i].date = data[i][d] = {
                                            value: realDate,
                                            display: [realDate.getFullYear(), (realDate.getMonth() + 1), realDate.getDate()].join('-'),
                                            dataType: 'date'
                                        };
                                    }
                                    else {
                                        data[i].date = data[i][d] = {
                                            value: tempDate,
                                            display: tempDate,
                                            dataType: 'date'
                                        };
                                    }
                                }
                                else if (urlRE.test(d)) {
                                    var tempUrl = data[i][d];
                                    data[i][d] = {
                                        value: tempUrl,
                                        display: tempUrl && tempUrl.length ? ('<a href="' + tempUrl + '" target="_blank">' + tempUrl.replace(urlTrimProtocolRE, '').replace(urlTrimDubRE, '').slice(0, 12) + '\u2026</a>') : null,
                                        dataType: 'url'
                                    };
                                }
                                else {
                                    if (data[i][d] && data[i][d].value) {
                                        var formattedData = {
                                            value: data[i][d].value,
                                            display: data[i][d].display,
                                            dataType: 'string'
                                        };

                                        data[i][d] = formattedData;
                                    }else {
                                        data[i][d] = {
                                            value: data[i][d],
                                            display: data[i][d],
                                            dataType: 'string'
                                        };
                                    }
                                }
                                data[i][d].label = getLabelFromLabels(d, fieldLabels);
                            }
                        }
                    }
                    return result;
                }
            }

            function getLabelFromLabels(name, labels) {
                var l = labels.length;
                while (l--) {
                    if (labels[l].name === name) {
                        return labels[l].display;
                    }
                }
            }
        }

        function runQueryHelper(query) {
            var config = query.config;
            var picklistsAvailable = config.picklists && config.picklists.length;

            function finishQuery(results) {
                query.deferred.resolve(getResultSet(results));
                ds.checkQueryQueue();
            }

            function reportQueryError(e) {
                query.deferred.reject(e);
                ds.checkQueryQueue();
            }

            function getPicklists(resp) {
                var deferred = Q.defer();
                if (picklistsAvailable) {
                    var thisPicklist = config.picklists.pop();
                    var nextPicklist = function() {
                        var deferredInner = Q.defer();
                        ds
                            .getPicklistValueLabels(config.object, thisPicklist)
                            .then(function (picklistResp) {
                                var thisPicklistsResp = picklistResp[config.object];
                                // got the object containing picklist values for each picklist field
                                for (var pk in thisPicklistsResp) { // loop over each of the piclist value lists
                                    if (thisPicklistsResp.hasOwnProperty(pk)) {
                                        var picklistName = pk; // the picklist name is also the name of the field in the record
                                        var picklistValues = thisPicklistsResp[pk]; // this object has all the possible values for the picklist
                                        for (var records = resp[config.object], r = records.length; r--;) {
                                            var record = records[r];
                                            if (record[picklistName] && (picklistValues[record[picklistName].value] || picklistValues[record[picklistName]])) {
                                                if (record[picklistName].value) {
                                                    record[picklistName].display = picklistValues[record[picklistName].value];
                                                }
                                                else if (picklistValues[record[picklistName]]) {
                                                    var formattedRecord = {
                                                        value: record[picklistName],
                                                        display: picklistValues[record[picklistName]]
                                                    };

                                                    record[picklistName] = formattedRecord;
                                                }
                                            }
                                        }
                                    }
                                }
                                deferredInner.resolve();
                            }, function (e) {
                                console.warn('picklist error', e);
                            });
                        return deferredInner.promise;
                    };

                    // TODO: Make this serial or recursive in some way or modify the queue to be lower level.
                    nextPicklist().then(function () {
                        thisPicklist = config.picklists.pop();
                        if (thisPicklist) {
                            nextPicklist().then(function () {
                                thisPicklist = config.picklists.pop();
                                if (thisPicklist) {
                                    nextPicklist();
                                }
                                else {
                                    deferred.resolve();
                                }
                            });
                        }
                        else {
                            deferred.resolve();
                        }
                    });
                }
                else {
                    deferred.resolve();
                }
                return deferred.promise;
            }

            // Get object label
            var objectLabelDeferred = Q.defer();
            ds.getObjectLabels([config.object]).then(function(resp) {
                objectLabelDeferred.resolve(resp);
            }, genericQueryErrorHandler(objectLabelDeferred));

            // Get field label
            var fieldLabelDeferred = Q.defer();
            ds.getFieldLabels(config).then(function(resp) {
                fieldLabelDeferred.resolve(resp);
            }, genericQueryErrorHandler(fieldLabelDeferred));

            // Query record
            var queryRecordDeferred = Q.defer();
            ds.queryRecord(config).then(function(resp) {
                queryRecordDeferred.resolve(resp);
            }, genericQueryErrorHandler(queryRecordDeferred));

            // When everything is done
            var allPromises = [objectLabelDeferred.promise, fieldLabelDeferred.promise, queryRecordDeferred.promise];
            Q.all(allPromises).then(function(allResp) {
                var objectLabelResp = allResp[0];
                var fieldLabelResp = allResp[1];
                var queryRecordResp = allResp[2];

                var runQueryResp = veevaUtil.copyObject(queryRecordResp);
                runQueryResp.object = objectLabelResp[config.object][0];
                runQueryResp.fieldLabels = fieldLabelResp;

                if(picklistsAvailable) {
                    getPicklists(runQueryResp).then(function() {
                        finishQuery(runQueryResp);
                    }, reportQueryError);
                } else {
                    finishQuery(runQueryResp);
                }
            }, reportQueryError);
        }

        function constructRequest(command, object, fields, where, sort, limit) {
            var request = [];
            if (command && object) {
                request.push('veeva:' + command + '(' + object + ')');
                if (fields) {
                    var fieldLabel = 'fields';
                    if(command === 'getPicklistValueLabels') {
                        fieldLabel = 'field';
                    } else if(command === 'getDataForObjectV2') {
                        fieldLabel = 'fieldName';
                    }
                    request.push(fieldLabel + '(' + fields + ')');
                }
                if (where) {
                    request.push('where(where ' + where + ')');
                }
                if (sort) {
                    request.push('sort(' + JSON.stringify(sort) + ')');
                }
                if (limit) {
                    request.push('limit(' + limit + ')');
                }

            } else if(command && arguments.length === 1) {
                // Case where no parameter is needed
                request.push('veeva:' + command + '()');

            } else {
                console.error('constructRequest: invalid arguments', command, object, fields);
            }
            return request.join(',');
        }

        function sendLinkingRequest(command, configObject) {
            var deferred = Q.defer();
            var req = constructLinkingRequest(command, configObject);

            query(req).then(function(resp) {
                deferred.resolve(resp);
            }, function(error) {
                deferred.reject(error);
            });

            return deferred.promise;
        }

        function constructLinkingRequest(command, configObject) {
            var request = [];
            if(typeof command === 'string' && command.length && typeof configObject === 'object') {
                request.push('veeva:' + command + '(' + configObject.object + ')');
                request.push('fields(' + JSON.stringify(configObject.fields) + ')');
            }
            return request.join(',');
        }

        function constructSmartLinkingRequest(configObject) {
            return "veeva:smartLinking(" + JSON.stringify(configObject) + ")";
        }

        /**
         * Register a callback function at the global scope
         * @param deferred the deferred object to resolve when this callback function is invoked.
         * @returns {string} the name of this callback function
         */
        function registerCallbackFunction(deferred) {
            var uniqueCallbackName = 'com_veeva_queryRecordReturn' + (+new Date());
            window[uniqueCallbackName] = function (resp) {
                var result = resp;
                var win8ParseError;

                if (typeof result === 'string') {
                    try {
                        result = JSON.parse(result);
                    }
                    catch (e) {
                        win8ParseError = veevaUtil.isWin8();
                        console.warn('query result returned as non-parseable string', e, result);
                    }
                }
                if(typeof win8ParseError === 'boolean' && win8ParseError){
                    result = formatResult(result);
                }
                if ((typeof result === 'object' && result && result.success) || result === null) {
                    deferred.resolve(wrapResult('query', formatResult(result)));
                }
                else {
                    for (var a = arguments.length; a--;) {
                        console.error('query failure arguments', arguments[a]);
                    }
                    var errorMessage = result.message || '';
                    deferred.reject('Query failed: ' + errorMessage + ' ' + JSON.stringify(result));
                }
            };
            return uniqueCallbackName;
        }

        function query(request) {
            var deferred = Q.defer();
            var callbackFunctionName = registerCallbackFunction(deferred);
            request = request + ',' + callbackFunctionName + '(result)';
            runAPIRequest(request);
            return deferred.promise;
        }

        function formatResult(result) {
            if (veevaUtil.isWin8()) {
                if (typeof result === 'string') {
                    result = eval('(' + result + ')');
                }
            }
            return result;
        }

        function wrapResult(apiName, result) {
            result = formatResult(result);
            if (typeof result === 'object' && result && !result.success) {
                result.message = apiName + ': ' + result.message;
            }
            return result;
        }

        function runAPIRequest(request) {
            if (veevaUtil.isWin8()) {
                window.external.notify(request);
            } else {
                //Remove the veeva: prefix, encode the remaining request, and add veeva: back.
                //This works with a basic replace because we only run ONE request here.
                request = request.replace(/^veeva:/, '');
                request = encodeURIComponent(request);
                request = 'veeva:' + request;

                document.location = request;
            }
        }

        function delegateQueryRequest(request, deferred, respHandler) {
            ds.queryRunning = true;
            query(request).then(function(resp) {
                /**
                 * If the optional callback function is given,
                 * let the callback function resolve the promise instead
                 */
                if(typeof respHandler === 'function') {
                    respHandler(resp, deferred);
                } else {
                    deferred.resolve(resp);
                }
                ds.queryRunning = false;
                ds.checkQueryQueue();
            }, function(error) {
                deferred.reject(error);
                ds.queryRunning = false;
                ds.checkQueryQueue();
            });
        }

        /**
         * Legacy queryRecord function.
         * Although this function still works, it should only be called within the library.
         */
        function queryRecord(object, fields, where, sort, limit) {
            var req = constructRequest('queryObject', object, fields, where, sort, limit);
            return query(req);
        }

        /**
         * Public facing functions
         */

        ds.queryRecord = function (queryObject) {
            // Fallback method for legacy queryRecord
            if(arguments.length > 1) {
                return queryRecord.apply(ds, arguments);
            }

            var deferred = Q.defer();

            if (ds.queryRunning) {
                ds.queriesQueue.push({
                    config: queryObject,
                    deferred: deferred,
                    type: 'queryRecord'
                });
            } else {
                var req = constructRequest('queryObject', queryObject.object, queryObject.fields, queryObject.where, queryObject.sort, queryObject.limit);
                delegateQueryRequest(req, deferred);
            }

            return deferred.promise;
        };

        ds.runQuery = function (queryConfig) {
            var deferred = Q.defer();
            var newQuery = {
                config: queryConfig,
                deferred: deferred,
                type: typeof queryConfig === 'string' ? 'apiRequest' : 'object'
            };
            if (ds.queryRunning) {
                ds.queriesQueue.push(newQuery);
            }
            else {
                runQueryHelper(newQuery);
            }
            return deferred.promise;
        };

        ds.querySalesData = function(queryObject) {
            var deferred = Q.defer();

            if(ds.queryRunning) {
                ds.queriesQueue.push({
                    config: queryObject,
                    deferred: deferred,
                    type: 'querySalesData'
                });
            } else {
                // we will use queryObject method from the platform to handle sales data for now
                var req = constructRequest('queryObject', queryObject.object, queryObject.fields, queryObject.where, queryObject.sort, queryObject.limit);
                delegateQueryRequest(req, deferred);
            }

            return deferred.promise;
        };

        ds.joinQueries = function (q1, q2, keyForID, fieldsLabelsToExclude, primaryObjectName) {
            var primaryQuery, secondaryQuery, joinTo, joinFrom;
            var joins = {};
            // get the primary query and secondary query
            if (q1.object.name === primaryObjectName) {
                primaryQuery = q1;
                secondaryQuery = q2;
            }
            else {
                primaryQuery = q2;
                secondaryQuery = q1;
            }
            // figure out which has the key on which to join the queries
            for (var k in q1.data[0]) {
                if (k === keyForID) {
                    joinTo = q1;
                    joinFrom = q2;
                    break;
                }
            }
            if (!joinTo) {
                joinTo = q2;
                joinFrom = q1;
            }
            // Set up a dictonary with references to each result on which to join
            for (var d = joinFrom.data.length; d--;) {
                joins[joinFrom.data[d].ID.value] = joinFrom.data[d];
            }
            // rename the fields on the secondary result set to reflect their unique relationship to the original results
            for (d = secondaryQuery.data.length; d--;) {
                for (k in secondaryQuery.data[d]) {
                    if (secondaryQuery.data[d].hasOwnProperty(k) && k !== 'date') {
                        var propertyToMove = secondaryQuery.data[d][k];
                        secondaryQuery.data[d][secondaryQuery.object.name + '.' + k] = propertyToMove;
                        delete(secondaryQuery.data[d][k]);
                    }
                }
            }
            // merge each record with its respective matching record
            // figure out if we need to append the object name to the keyForID in the case where the joinTo === secondaryQuery
            if (joinTo.object.name === secondaryQuery.object.name) {
                keyForID = joinTo.object.name + '.' + keyForID;
            }
            for (d = joinTo.data.length; d--;) {
                // merge joinTo[d] with joins[joinTo[d][keyForID]]
                veevaUtil.mergeObjects(joinTo.data[d], joins[joinTo.data[d][keyForID].value]); // does the key for ID include the object name or not. it will if joinTo === secondaryQuery;
            }

            // begin label renaming and combining
            var deleteExcludedLabels = function (labels) {
                    for (var k in fieldsLabelsToExclude) {
                        for (var n = labels.length; n--;) {
                            if (labels[n].name === k) {
                                labels.splice(n, 1);
                            }
                        }
                    }
                    return labels;
                },
                primaryLabels = deleteExcludedLabels(primaryQuery.fieldLabels),
                secondaryLabels = deleteExcludedLabels(secondaryQuery.fieldLabels);
            // rename labels in q2
            for (var l = secondaryLabels.length, label; l--;) {
                label = secondaryLabels[l];
                label.name = secondaryQuery.object.name + '.' + label.name;
            }
            joinTo.fieldLabels = primaryLabels.concat(secondaryLabels);
            joinTo.object = primaryQuery.object;
            joinTo.name = primaryQuery.name;
            return joinTo;
        };

        ds.getInStatement = function (ids) {
            var online = veevaUtil.isOnline();
            var statmentEnd = online ? ')' : '}';
            var statementBegin = online ? '(' : '{';
            return statementBegin + '\'' + ids.join('\',\'') + '\'' + statmentEnd;
        };

        /*
         Returns the value of a field for a specific record related to the current object
         */
        ds.getDataForCurrentObject = function (object, field) {
            var deferred = Q.defer();

            if(ds.queryRunning) {
                ds.queriesQueue.push({
                    object: object,
                    field: field,
                    deferred: deferred,
                    type: 'getDataForCurrentObject'
                });
            } else {
                var req = constructRequest('getDataForObjectV2', object, field);
                delegateQueryRequest(req, deferred);
            }

            return deferred.promise;
        };

        ds.getObjectLabels = function (objects) {
            var deferred = Q.defer();

            if(ds.queryRunning) {
                ds.queriesQueue.push({
                    config: objects,
                    deferred: deferred,
                    type: 'getObjectLabels'
                });
            } else {
                var req = constructRequest('getObjectLabels', JSON.stringify(objects));
                delegateQueryRequest(req, deferred);
            }

            return deferred.promise;
        };

        ds.getFieldLabels = function (queryConfig) {
            var deferred = Q.defer();
            var object = queryConfig.object;
            var fields = queryConfig.fields;

            var respHandler = function(resp, deferred) {
                var i = fields.length;
                var labels = resp[object];
                var newLabels = [];
                while (i--) {
                    newLabels.unshift({
                        name: fields[i],
                        display: labels[fields[i]]
                    });
                }
                deferred.resolve(newLabels);
            };

            if(ds.queryRunning) {
                ds.queriesQueue.push({
                    config: queryConfig,
                    deferred: deferred,
                    type: 'getFieldLabels'
                });
            } else {
                var req = constructRequest('getFieldLabel', object, JSON.stringify(fields));
                delegateQueryRequest(req, deferred, respHandler);
            }

            return deferred.promise;
        };

        /*
         Returns the translated label for each of the picklist values of the specified field

         object - API Name of the object
         field - API Name of the picklist field
         */
        ds.getPicklistValueLabels = function (object, field) {
            var deferred = Q.defer();

            if(ds.queryRunning) {
                ds.queriesQueue.push({
                    object: object,
                    field: field,
                    deferred: deferred,
                    type: 'getPicklistValueLabels'
                });
            } else {
                var req = constructRequest('getPicklistValueLabels', object, field);
                delegateQueryRequest(req, deferred);
            }

            return deferred.promise;
        };

        ds.getVeevaMessagesWithDefault = function (tokens, languageLocaleKey) {
            var deferred = Q.defer();
            var config = veevaUtil.copyObject(queries.translations);
            var whereSubClauses = [];
            var index = tokens.length;
            var cachedResponses = [];
            var cache = translationsCache;
            while (index--) {
                if (!cache[tokens[index].msgName + ':' + tokens[index].msgCategory]) {
                    whereSubClauses.push("(Name='" + tokens[index].msgName + "' AND Category_vod__c='" + tokens[index].msgCategory + "')");
                }
                else {
                    cachedResponses.push(cache[tokens[index].msgName + ':' + tokens[index].msgCategory]);
                }
            }
            config.where += "(" + whereSubClauses.join(" OR ") + ")" + " AND Language_vod__c='" + languageLocaleKey + "'";
            // if all the responses were in the cache, then this will be empty and we just return the cached responses.
            if (whereSubClauses.length) {
                ds.runQuery(config)
                    .then(function (resp) {
                        var data = resp.data;
                        var d = data.length;
                        deferred.resolve(data.concat(cachedResponses));
                        while (d--) {
                            if (!cache[data[d].Name.value + ':' + data[d].Category_vod__c.value]) {
                                cache[data[d].Name.value + ':' + data[d].Category_vod__c.value] = data[d];
                            }
                        }
                    });
            }
            else {
                deferred.resolve(cachedResponses);
            }
            return deferred.promise;
        };

        ds.checkQueryQueue = function() {
            if (ds.queriesQueue.length && !ds.queryRunning) {
                var next = ds.queriesQueue.shift();
                if (next.type === 'apiRequest') {
                    ds.queryRunning = true;
                    query(next.config).then(function (resp) {
                        next.deferred.resolve(resp);
                        ds.queryRunning = false;
                        ds.checkQueryQueue();
                    });
                } else if(next.type === 'queryRecord' || next.type === 'queryRecord_ol') {
                    ds.queryRecord(next.config).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if(next.type === 'querySalesData' || next.type === 'querySalesData_ol') {
                    ds.querySalesData(next.config).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if(next.type === 'getAvailableObjects' || next.type === 'getAvailableObjects_ol') {
                    ds.getAvailableObjects().then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if(next.type === 'getObjectMetadata' || next.type === 'getObjectMetadata_ol') {
                    ds.getObjectMetadata(next.config).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if(next.type === 'getRecordTypeLabels' || next.type === 'getRecordTypeLabels_ol') {
                    ds.getRecordTypeLabels(next.config).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if (next.type === 'getFieldLabels' || next.type === 'getFieldLabels_ol') {
                    ds.getFieldLabels(next.config).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if (next.type === 'getObjectLabels' || next.type === 'getObjectLabels_ol') {
                    ds.getObjectLabels(next.config).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if (next.type === 'getPicklistValueLabels' || next.type === 'getPicklistValueLabels_ol') {
                    ds.getPicklistValueLabels(next.object, next.field).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if (next.type === 'getDataForCurrentObject' || next.type === 'getDataForCurrentObject_ol') {
                    ds.getDataForCurrentObject(next.object, next.field).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if (next.type === 'smartLinking' || next.type === 'smartLinking_ol') {
                    ds.smartLinking(next.config).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else if (next.type === 'queryVDSRecord') {
                    ds.queryVDSRecord(next.config).then(function(resp) {
                        next.deferred.resolve(resp);
                    }, genericQueryErrorHandler(next.deferred));
                } else {
                    runQueryHelper(next);
                }
            }
        };

        ds.newRecord = function(configObject) {
            return sendLinkingRequest('newRecord', configObject);
        };

        ds.viewRecord = function(configObject) {
            return sendLinkingRequest('viewRecord', configObject);
        };

        ds.smartLinking = function(configObject) {
            var deferred = Q.defer();

            if(ds.queryRunning) {
                ds.queriesQueue.push({
                    config: configObject,
                    deferred: deferred,
                    type: 'smartLinking'
                });
            } else {
                var req = constructSmartLinkingRequest(configObject);
                delegateQueryRequest(req, deferred);
            }

            return deferred.promise;
        };

        ds.executeSuggestionAction = function(suggestionId, actionType) {
            return ds.smartLinking({
                object: "Suggestion_vod__c",
                action: actionType ? actionType : 'execute',
                options: {
                    record: {
                        Id: suggestionId
                    }
                }
            });
        };

        ds.launchMediaForAccount = function(accountId, presentationId, keyMessageMediaFileName) {
            var linkingOptions = {
                prefill: {
                    Call2_vod__c: {
                        Account_vod__c: accountId ? accountId : ''
                    }
                }
            };

            // presentation id and key message file name are optional, but need to pass together
            if(presentationId && keyMessageMediaFileName) {
                linkingOptions.record = {
                    Presentation_Id_vod__c: presentationId,
                    Key_Message_vod__c: {
                        Media_File_Name_vod__c: keyMessageMediaFileName
                    }
                };
            }

            return ds.smartLinking({
                object: "Clm_Presentation_vod__c",
                action: "launch",
                options: linkingOptions
            });
        };

        ds.getAvailableObjects = function() {
            var deferred = Q.defer();

            if(ds.queryRunning) {
                ds.queriesQueue.push({
                    config: {},
                    deferred: deferred,
                    type: 'getAvailableObjects'
                });
            } else {
                var req = constructRequest('getAvailableObjects');
                delegateQueryRequest(req, deferred);
            }

            return deferred.promise;
        };

        ds.getObjectMetadata = function(queryObject) {
            var deferred = Q.defer();

            if(queryObject && queryObject.object) {
                if (ds.queryRunning) {
                    ds.queriesQueue.push({
                        config: queryObject,
                        deferred: deferred,
                        type: 'getObjectMetadata'
                    });
                } else {
                    var req = constructRequest('getObjectMetadata', queryObject.object);
                    delegateQueryRequest(req, deferred);
                }
            } else {
                deferred.reject("'getObjectMetadata' was called with invalid parameter: " + queryObject);
            }

            return deferred.promise;
        };

        ds.getRecordTypeLabels = function(objectName) {
            var deferred = Q.defer();

            if(ds.queryRunning) {
                ds.queriesQueue.push({
                    config: objectName,
                    deferred: deferred,
                    type: 'getRecordTypeLabels'
                });
            } else {
                var req = constructRequest('getRecordTypeLabels', objectName);
                delegateQueryRequest(req, deferred);
            }

            return deferred.promise;
        };

        /*
        * CDW Query Record
        *
        * */
        ds.queryVDSRecord = function(configObject) {
            var deferred = Q.defer();
            var request;

            if (ds.queryRunning) {
                ds.queriesQueue.push(
                    {
                        config: configObject,
                        deferred: deferred,
                        type: 'queryVDSRecord'
                    }
                );
            } else {
                request = constructRequest('queryVDSRecord', configObject.object, configObject.fields, configObject.where, configObject.sort, configObject.limit);
                delegateQueryRequest(request, deferred);
            }

            return deferred.promise;
        };

        // switch in here for the different overrides?
        if (veevaUtil.isOnline()) {
            window.OnlineAPI.call(ds);
        }
    };

    window.ds = new DataService();
})(window.Q);
