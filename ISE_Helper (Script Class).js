var ISE_Helper = Class.create();
ISE_Helper.prototype = {
    initialize: function() {},

    fnUpdateISE: function(grNetworkAdapter, grComputer, event) {
        if (typeof(grNetworkAdapter.getUniqueValue()) == 'undefined') {
            var grLocalNA = new GlideRecord('cmdb_ci_network_adapter');
            grLocalNA.get(grNetworkAdapter);
            grNetworkAdapter = grLocalNA;
        }
        if (typeof(grComputer.getUniqueValue()) == 'undefined') {
            var grLocalComputer = new GlideRecord('cmdb_ci_computer');
            grLocalComputer.get(grComputer);
            grComputer = grLocalComputer;
        }
        var strSerial = grComputer.serial_number.toString();
	
	//var strInstallStatus = '1';
    var strInstallStatus = grComputer.install_status.toString();
        
	var strInventoried = "false";
        var GUIDendpoint = "";
        if ((!grNetworkAdapter.correlation_id) || (event.parm1.toString() === 'true')) {
            var getOBJviaMAC = this.fnGetGUIDviaMAC(grNetworkAdapter.mac_address.toString());
            if (getOBJviaMAC !== 'error') {
                GUIDendpoint = this.fnParseGUID(getOBJviaMAC);
                grNetworkAdapter.correlation_id = GUIDendpoint;
            }
        } else {
            //                GUIDendpoint = this.fnParseGUID(getOBJviaMAC);
            GUIDendpoint = grNetworkAdapter.correlation_id.toString();
        }
        var strSerialSource = "ServiceNow";
        if (strInstallStatus === '1') {
            strInventoried = "true";
        } else {
            strInventoried = "false";
        }
        var strInventoryDisplay = null;
        if (strInventoried === "true") {
            strInventoryDisplay = "PASS";
        } else {
            strInventoryDisplay = "FAIL (Internet access may be blocked)";
        }
        var PUTResponse = this.fnPUTEndpointDetails(GUIDendpoint, strSerial, strSerialSource, strInventoried, event, grNetworkAdapter);
        if (typeof PUTResponse === "undefined") {
            //            gs.addErrorMessage("Error retrieving ISE details for device " + grNetworkAdapter.mac_address + ".");
        }
        if ((PUTResponse.toString() === '404') && (event.parm1.toString() !== 'true')) {
            strInventoryDisplay = "Error finding endpoint in ISE. Retrying once...";
        } else if ((PUTResponse.toString() === '404') && (event.parm1.toString() === 'true')) {
            strInventoryDisplay = "Error finding endpoint in ISE on 2nd attempt. Aborting.";
        } else if (event.parm1.toString() === 'true') {
            strInventoryDisplay = strInventoryDisplay + " (refreshed correlation ID)";
        }
        grNetworkAdapter.u_correlation_last_check = gs.now().toString();
        //		grNetworkAdapter.comments = "ISE: " + (new GlideDateTime()).getDisplayValueInternal() + " (" + grComputer.sys_updated_by + ") Status: " + strInventoryDisplay + "\r" + grNetworkAdapter.comments;
        grNetworkAdapter.comments = "ISE: " + (new GlideDateTime()).getDisplayValueInternal() + " " + strInventoryDisplay;
        grNetworkAdapter.autoSysFields(false); // records shouldn't receive system updates
        grNetworkAdapter.setWorkflow(false); // business rules shouldn't be run
        grNetworkAdapter.update();
        grNetworkAdapter.autoSysFields(true); // records shouldn't receive system updates
        grNetworkAdapter.setWorkflow(true); // business rules shouldn't be run
    },

    // get GUID of endpoint via MAC address
    fnGetGUIDviaMAC: function(strMAC) {
        try {
            var r = new sn_ws.RESTMessageV2('ISE-SVR', 'Get_GUI_By_MAC');
            r.setStringParameterNoEscape('mac', strMAC);
            r.setEccParameter('skip_sensor', true);
            var response = r.execute();
            var responseBody = response.getBody();
            var httpStatus = response.getStatusCode();
            return responseBody;
        } catch (ex) {
            var message = ex.message;
            return "error";
        }
    },

    // parse out GUID
    fnParseGUID: function(responseBody) {
        var parser = new global.JSON();
        var obj = parser.decode(responseBody);
        if (!obj.hasOwnProperty('SearchResult')) {
            return null;
        } else {
            return obj.SearchResult.resources[0].id.toString();
        }
    },

    // get details of endpoint via GUID
    fnGetEndpointDetails: function(GUIDendpoint) {
        try {
            var r = new sn_ws.RESTMessageV2('ISE-SVR', 'GET_Endpoint_Details');
            r.setStringParameterNoEscape('GUIDEndpoint', GUIDendpoint);
            r.setEccParameter('skip_sensor', true);
            var response = r.execute();
            var responseBody = response.getBody();
            var httpStatus = response.getStatusCode();
            return responseBody;
        } catch (ex) {
            var message = ex.message;
        }
    },

	fnDeleteEndpoint: function(GUIDendpoint) {
        try {
            var r = new sn_ws.RESTMessageV2('ISE-SVR', 'DELETE_Endpoint');
            r.setStringParameterNoEscape('GUIDendpoint', GUIDendpoint);
            r.setEccParameter('skip_sensor', true);
            var response = r.execute();
            var responseBody = response.getBody();
            var httpStatus = response.getStatusCode();
            return httpStatus;
        } catch (ex) {
            var message = ex.message;
        }
    },
	
	fnCreateEndpoint: function(endpointMAC,SerialNumber, SerialSource, InventoryStatus) {
		try {
            var r = new sn_ws.RESTMessageV2('ISE-SVR', 'CREATE_Endpoint');
            r.setStringParameterNoEscape('endpoint_mac',endpointMAC);
            r.setStringParameterNoEscape('SerialNumber', SerialNumber);
            r.setStringParameterNoEscape('SerialSource', SerialSource);
            r.setStringParameterNoEscape('InventoryStatus', InventoryStatus);
            r.setEccParameter('skip_sensor', true);
            var response = r.execute();
            var responseBody = response.getBody();
            var httpStatus = response.getStatusCode();
            return httpStatus;
        } catch (ex) {
            var message = ex.message;
        }
	},
	
	/*
	fnCreateEndpointOnly: function(endpointMAC) {
        try {
            var r = new sn_ws.RESTMessageV2('ISE-SVR', 'CREATE_Endpoint');
            r.setStringParameterNoEscape('endpoint_mac',endpointMAC);
            r.setEccParameter('skip_sensor', true);
            var response = r.execute();
            var responseBody = response.getBody();
            var httpStatus = response.getStatusCode();
            return httpStatus;
        } catch (ex) {
            var message = ex.message;
        }
    },
	*/
	
    fnPUTEndpointDetails: function(GUIDendpoint, SerialNumber, SerialSource, InventoryStatus, event, grNetworkAdapter) {
        try {
            var r = new sn_ws.RESTMessageV2('ISE-SVR', 'PUT_Endpoint_Update');
            r.setStringParameterNoEscape('SerialNumber', SerialNumber);
            r.setStringParameterNoEscape('GUIDendpoint', GUIDendpoint);
            r.setStringParameterNoEscape('SerialSource', SerialSource);
            r.setStringParameterNoEscape('InventoryStatus', InventoryStatus);
            r.setEccParameter('skip_sensor', true);
            var response = r.execute();
            var responseBody = response.getBody();
            var httpStatus = response.getStatusCode();
            if (httpStatus === 404) {
                // only try to update once, otherwise we endless loop
                if (event.parm1.toString() !== 'true') {
                    gs.eventQueue('au.itsm.ise.update', grNetworkAdapter, true, grNetworkAdapter.mac_address);
                }
            }
            //			return "ISE PUT success";
        } catch (ex) {
            var message = ex.message;
            //			return "ISE PUT failed";
        }
        return httpStatus;
    },

    type: 'ISE_Helper'
};