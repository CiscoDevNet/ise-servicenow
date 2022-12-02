(function executeRule(current, previous /*null when async*/ ) {
		
    try {
        // Add your code here
        var strInventoried = "false";
        var si = new global.ISE_Helper();
        var GUIDendpoint = "";
        if (!current.correlation_id) {
            var getOBJviaMAC = si.fnGetGUIDviaMAC(current.mac_address.toString());
            var myParser = new global.JSON();
            var myObj = myParser.decode(getOBJviaMAC);
            //Check validity of ISE API response
            if (!myObj.hasOwnProperty('SearchResult')) {
                    gs.addInfoMessage("Error returned from ISE");
            } else {
                //If ISE response includes 0 matches
                if (getOBJviaMAC.includes(': 0,')) {
                    gs.addInfoMessage("No matching endpoint in ISE");
                    
                    //Optionaly create new MAC address
                    var createResp = si.fnCreateEndpoint(current.mac_address.toString());
    
                    //If receive correct response from server of object creation
                    if (createResp.toString() === '201') {
                        gs.addInfoMessage("Successfully created endpoint in ISE");
                        //Update the OBJ for determining the GUID
                        getOBJviaMAC = si.fnGetGUIDviaMAC(current.mac_address.toString());
                        GUIDendpoint = si.fnParseGUID(getOBJviaMAC);
                    }
                    
                } else {
                    gs.addInfoMessage("Found matching endpoint in ISE");
                    GUIDendpoint = si.fnParseGUID(getOBJviaMAC);
                    current.correlation_id = GUIDendpoint;
                }
                
            }
    
        } else {
            GUIDendpoint = current.correlation_id.toString();
        }
    
        var strSerial = current.cmdb_ci.serial_number.toString();
        var strSerialSource = "ServiceNow";
        //if ((current.cmdb_ci.serial_number.toString().length > 0) && (current.cmdb_ci.department.toString().length > 0) && (current.cmdb_ci.u_room.toString().length > 0)) {
        if (current.cmdb_ci.install_status.toString() === '1') {
            strInventoried = "true";
        } else {
            strInventoried = "false";
        }
        var strInventoryDisplay = null;
        if(strInventoried==="true") {
            strInventoryDisplay = "PASS";
        } else {
            strInventoryDisplay = "FAIL (Internet access may be blocked)";		
        }
        //gs.addInfoMessage("Attempting to update details to ISE with: " + strSerial + "," + strInventoried + "," + strSerialSource);
        var PUTResponse = si.fnPUTEndpointDetails(GUIDendpoint, strSerial, strSerialSource, strInventoried);
        if(typeof PUTResponse==="undefined") {
            gs.addErrorMessage("Error retrieving ISE details for device " + current.mac_address + ".");
        } else {
            gs.addInfoMessage("Refreshed ISE. Inventory status: " + strInventoryDisplay + " with MAC address " + current.mac_address);
            //gs.addInfoMessage(PUTResponse);
            if(current.mac_address==='AC:DE:48:00:11:22') {
                gs.addInfoMessage(PUTResponse);
            }
        }
    } catch (err) {
        gs.addErrorMessage("Error retrieving ISE details for device " + current.mac_address + ".");
    }
    
    })(current, previous);