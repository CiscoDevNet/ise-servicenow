(function executeRule(current, previous /*null when async*/ ) {

	
    try {
        // Add your code here
        var strInventoried = "false";
        var si = new global.ISE_Helper();
        var GUIDendpoint = "";
        var strSerial = current.cmdb_ci.serial_number.toString();
        var strSerialSource = "ServiceNow";
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
        
        //If network adapter record does not have existing ISE Correlation ID populated
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
                    var createResp = si.fnCreateEndpoint(current.mac_address.toString(),strSerial, strSerialSource, strInventoried);
    
                    //If receive correct response from server of object creation
                    if (createResp.toString() === '201') {
                        gs.addInfoMessage("Successfully created endpoint in ISE");
                        //Update the OBJ for determining the GUID
                        getOBJviaMAC = si.fnGetGUIDviaMAC(current.mac_address.toString());
                        GUIDendpoint = si.fnParseGUID(getOBJviaMAC);
                    }
                } else {
                    //If there is an existing entry in ISE...
                    gs.addInfoMessage("Found matching endpoint in ISE");
                    GUIDendpoint = si.fnParseGUID(getOBJviaMAC);        //Parse the GUID
                    current.correlation_id = GUIDendpoint;              //Set the value to network adapter record
                    var PUTResponse = si.fnPUTEndpointDetails(GUIDendpoint, strSerial, strSerialSource, strInventoried);
                    if (typeof PUTResponse==="undefined") {             //If the record was not updated correctly
                        gs.addErrorMessage("Error retrieving ISE details for device " + current.mac_address + ".");
                    } else {                                            //If the record was updated correctly
                        gs.addInfoMessage("Refreshed ISE. Inventory status: " + strInventoryDisplay + " with MAC address " + current.mac_address);
                    }
                }
            }
        }
    } catch (err) {
        gs.addErrorMessage("Error retrieving ISE details for device " + current.mac_address + ".");
    }
            /*
            } else {
            GUIDendpoint = current.correlation_id.toString();
        }
    
        var PUTResponse = si.fnPUTEndpointDetails(GUIDendpoint, strSerial, strSerialSource, strInventoried);
        if(typeof PUTResponse==="undefined") {
            gs.addErrorMessage("Error retrieving ISE details for device " + current.mac_address + ".");
        } else {
            gs.addInfoMessage("Refreshed ISE. Inventory status: " + strInventoryDisplay + " with MAC address " + current.mac_address);
        }
    } catch (err) {
        gs.addErrorMessage("Error retrieving ISE details for device " + current.mac_address + ".");
    }
    */
    
})(current, previous);