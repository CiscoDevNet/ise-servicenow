(function executeRule(current, previous /*null when async*/ ) {
		
    try {
        // Add your code here
        var strInventoried = "false";
        var si = new global.ISE_Helper();
        var myMAC = "";
        var GUIDendpoint = "";
        var DELresponse = "";
        
        // Grab the current GUID for the MAC address of the network adapter
        if (!current.correlation_id) {
            var getOBJviaMAC = si.fnGetGUIDviaMAC(current.mac_address.toString());
            if (getOBJviaMAC !== 'error') {
                GUIDendpoint = si.fnParseGUID(getOBJviaMAC);
                current.correlation_id = GUIDendpoint;
            } else {
                gs.info('DEBUG_LOG_CUSTOM: error finding endpoint in ISE');
            }
        } else {
            GUIDendpoint = current.correlation_id.toString();
        }
    
        gs.addInfoMessage("Attempting to delete endpoint from ISE: " + current.mac_address.toString());
        
        //Run the DELETE API call using the retreived GUID
        DELresponse = si.fnDeleteEndpoint(GUIDendpoint);
        
        if (DELresponse.toString() === '204') {
            gs.addInfoMessage("Updated ISE. Record deleted");
        } else {
            gs.addInfoMessage("Error deleting ISE endpoint " + current.mac_address);
        }
    
        current.u_correlation_last_check = gs.now().toString();
    } catch (err) {
        gs.addErrorMessage("Error retrieving ISE details for device " + current.mac_address + ".");
    }
    
    })(current, previous);