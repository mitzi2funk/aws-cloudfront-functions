function handler(event) {
    var request = event.request;
    var headers = request.headers;
    var clientIP = event.viewer.ip;
    var host = headers.host.value;
    var uri = request.uri;
    var referer = (headers['referer']) ? headers.referer.value : '';
    var normalURL = `https://${host}`
    var maintenanceURI = '/maintenance'
    var maintenanceURL = `${normalURL}${maintenanceURI}`
    var errorURI = '/access-denied'
    var errorURL = `${normalURL}${errorURI}`
    var EXCLUDE_URI_LIST = [
        '/sorry/index.html',
        '/sorry/en/index.html',
        '/favicon.ico',
    ];
    // Set the White List for maintenance
    var IP_WHITE_LIST = [
        '192.168.0.1', // A
        '192.168.0.2', // B
        '192.168.0.3', // C
    ];
    // Set the White List for admin site
    var IP_WHITE_LIST_ADMIN = [
        '192.168.1.1', // A
        '192.168.1.2', // B
        '192.168.1.3', // C
    ];
    // echo -n user:pass | base64
    var authString_dev = "Basic ABCDEFG";
    var authString = "Basic ABCDEFG";
    var regexpSubDomain_dev = /dev.example.com|stg.example.com/g
    var regexpDomain = /example.com/g
    var regexpDomain_sub = /sub.example.com/g
    var regexpURL_referer = /https\:\/\/example.com|https\:\/\/stg.example.com|https\:\/\/dev.example.com/g
    var regexpUriAdmin = /\/admin\//g


    // [xx. Check excluded URIs]
    var resultCheckURI = EXCLUDE_URI_LIST.includes(uri)
    if (resultCheckURI) {
        console.log('Excluded URI');
        return request;
    }


    // [01. Maintenance Mode]
    // Set start and end time
    // (Ex) 2022/08/09 16:30:00 -> Date(2022, 8, 9, 16, 30, 0); [JST]
    var dateStart = new Date(2023, 1, 25, 22, 0, 0);
    var dateEnd = new Date(2023, 1, 26, 1, 0, 0);
    dateStart.setMonth(dateStart.getMonth() - 1);
    dateEnd.setMonth(dateEnd.getMonth() - 1);

    // Check the maintenance date and time
    var dateCurrent = new Date(Date.now());
    dateCurrent.setHours(dateCurrent.getHours() + 9);

    if (dateStart.getTime() <= dateCurrent.getTime() && dateCurrent.getTime() <= dateEnd.getTime()) {
        console.log('Under the maintenance');

        // [Check if it is included in the IP address list]
        var isPermittedIp = IP_WHITE_LIST.includes(clientIP);
        console.log(`Maintenance URL: ${maintenanceURL}`);

        if (isPermittedIp) {
            console.log('IP address check passed in maintenance mode');
        } else {
            console.log('Redirect to maintenance site');
            var response = {
                statusCode: 302,
                statusDescription: 'Found',
                headers: { "location": { "value": maintenanceURL } }
            }
            return response;
        }
    } else {
        console.log('Not under maintenance');
    }


    // [02. Admin site access control]
    if (regexpDomain.test(host) && regexpUriAdmin.test(uri)) {

        var isPermittedIpAdmin = IP_WHITE_LIST_ADMIN.includes(clientIP);

        if (isPermittedIpAdmin) {
            console.log('IP address check to admin site passed');
        } else {
            console.log('Redirect to error page by admin site access control');
            console.log(`error page: ${errorURL}`);
            var response = {
                statusCode: 302,
                statusDescription: 'Found',
                headers: { "location": { "value": errorURL } }
            }
            return response;
        }
    }


    // [03. sub-domain access control]
    if (regexpDomain_sub.test(host)) {
        if (referer && regexpURL_referer.test(referer)) {
            console.log('referer check to sub-domain passed');
            console.log(`referer: ${referer}`);
        } else if (referer && regexpDomain_sub.test(referer)) {
            console.log('referer check to sub-domain passed');
            console.log(`referer: ${referer}`);
        } else {
            console.log('Redirect to error page by sub-domain access control');
            console.log(`error page: ${errorURL}`);
            var response = {
                statusCode: 302,
                statusDescription: 'Found',
                headers: { "location": { "value": errorURL } }
            }
            return response;
        }
    }


    // [04. Basic Authentication]
    if (regexpSubDomain_dev.test(host) && !regexpDomain_sub.test(host)) {
        if (typeof headers.authorization === "undefined" || headers.authorization.value !== authString_dev) {
            return {
                statusCode: 401,
                statusDescription: "Unauthorized",
                headers: { "www-authenticate": { value: "Basic" } }
            };
        }
    } else if (regexpDomain.test(host) && !regexpDomain_sub.test(host)) {
        if (typeof headers.authorization === "undefined" || headers.authorization.value !== authString) {
            return {
                statusCode: 401,
                statusDescription: "Unauthorized",
                headers: { "www-authenticate": { value: "Basic" } }
            };
        }
    }


    // [05. Path Completion]
    // Check whether the URI is missing a file name.
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }
    // Check whether the URI is missing a file extension.
    else if (!uri.includes('.')) {
        request.uri += '/index.html';
    }


    return request;

}