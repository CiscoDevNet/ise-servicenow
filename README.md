# ServiceNow Integration with Cisco ISE

## OVERVIEW

This guide is intended to show how to allow the ServiceNow platform to use information from ServiceNow's CMDB to update endpoint records within ISE. This guide will focus on the following use case:

## USE CASE:

A customer has an inventory of their computers in ServiceNow and would like to ensure that only those computers are allowed access to the network. ServiceNow will therefore inform Cisco ISE of the status of computer objects and ISE will have a policy to either drop ping (default) or allow access (if Computuer is in the Inventory). In this case, the ServiceNow database will use the Status field with a value of "Installed"; to indicate a device as being in the inventory (see screenshot):
![](images/useCaseExample.png)

## REQUIREMENTS:

- ISE v2.4 or later (screenshots are ISE 3.1)
- ServiceNow Instance (Orlando or later)
- ServiceNow MID-Server with access to ISE PSN (TCP 80/443/9060)
  - Instructions on how to install a MID Server can be found [here](https://docs.servicenow.com/bundle/quebec-servicenow-platform/page/product/mid-server/concept/mid-server-installation.html)

## OUTLINE:

1. Create ERS user account within ISE(#_1._CREATE_ERS)
2. Enable ERS Gateway within ISE(#_2._ENABLE_ERS)
3. Create Custom Attributes within ISE(#_3._CREATE_CUSTOM)
4. Create new Policy Conditions and AuthZ Profile(#_4._CREATE_NEW)
5. Verify ERS Functionality via Postman(#_5._Verify_ERS)
6. Create MID Server app / Bind App to MID Server on Prem(#_6._CREATE_NEW)
7. Create the REST API queries in ServiceNow(#_7._CREATE_THE)
  1. Get_GUI_By_MAC(#_Create_a_new)
  2. Get_Endpoint_Details(#_Create_new_HTTP)
  3. Put_Endpoint_Update(#_Create_new_HTTP_1)
8. Script Automation within ServiceNow(#_8._Script_Automation)
  1. Defining the ServiceNow Script Class(#_Define_the_ServiceNow)
  2. Defining the ServiceNow Business Rule(#_Define_the_ServiceNow_1)
9. Testing the Overall Solution(#_9._Testing_the)

Troubleshooting(#_TROUBLESHOOTING)
Appendix 1(#_APPENDIX_1:_ISE_Helper)
Appendix 2

## Create ERS user account within ISE


## STEP 1. CREATE ERS Account in ISE

From the ISE Admin portal, navigate to Administration -> System -> Admin Access -> Administrators -> Admin Users and click on "Add" -> "Create an Admin User"

Assign this user the "ERS Admin" role and click Submit

![](images/createERSadmin1.png)

![](images/createERSadmin2.png)

## STEP 2. ENABLE ERS Gateway within ISE

Navigate to Administration -> System -> Settings -> API Settings

Switch to the "API Service Settings" tab and enable the ERS (Read/Write) button and click "Save".

NOTE: Though not required for this tutorial, the screenshot below also shows OpenAPI enabled as well.

![](images/enableERSgateway.png)

## STEP 3. Create Custom Attributes in ISE

Navigate to Identity Management -> Settings -> Endpoint Custom Attributes and create three conditions:

In our scenario, we will create three new attributes:
**InventoryStatus** (Boolean) – the "true/false" value for whether or not an endpoint is in the inventory
**SerialNumber** (string) – this value will store the SerialNumber details from records in ServiceNow
**SerialSource** (string) – (optional) this value will store "ServiceNow" as the source to distinguish the record change from other 3rd party integrations or manual modification

![](images/createCustomAttributes1.png)

Click "Save" to save your changes.

To verify that these new attributes have now been added to the ISE endpoint database, navigate to Context Visibility -> Endpoints and select a random mac address. In this case, we've selected our test MAC address of BB:BB:BB:BB:BB:BB

Under Attributes, click the Custom Attributes tab

![](images/CreateCustomAttributes2.png) ![](images/createCustomAttributes3.png)

NOTE: By default these new values will be blank on all endpoints, including the Boolean "InventoryStatus". This will become relevant later in the tutorial.

## STEP 4. Create New Authorization Conditions / AuthZ Profile

Navigate to Policy -> Policy Sets and we will create two rules (a permit and a deny rule) using the value of the new "InventoryStatus" custom attribute that will be populated by ServiceNow. When adding the condition for the each rule, you can search the Attribute field to quickly find the "InventoryStatus" field.

![](images/createAuthZrule1.png)

**NOTE: Since the default value for the "InventoryStatus" field for all endpoints is blank, these rules would need to target specific device types (Workstations, etc.) to avoid blocking all devices when this feature is enabled.**

The resulting rules should look like the following:

![](images/createAuthZrule2.png)

In this example, the AuthZ rule "DROP_PING" pushes a dACL that drops PING traffic for the workstation. However, this could be customized in a variety of ways including a redirect to a splash page that informs the user their device is not in the inventory.

## STEP 5. Verify ERS Functionality via Postman

Now that ISE rules/policies have been setup, let's test the functionality using Postman. Reminder that we will need to search for the MAC address of the endpoint for our inventory to obtain the GUID for the record within ISE. This GUID will then be used to gather additional details about the endpoint and/or update the endpoint record.

[Click here for a tutorial on how to use Postman](https://learning.postman.com/docs/getting-started/introduction/)

1. Create a new collection for ISE ERS connectivity.
2. Create a new request inside the collection and name it Endpoint By MAC 
    - 2a. Set the value of the request to "GET" with a URL of https://<ISE>:9060/ers/config/endpoint
    - 2b. Under Params, add the key "filter"; with a value of "mac.EQ.<your mac>" which includes a MAC address in your ISE instance.
    ![](images/postman1.png)
    
    The URL now should read: https://<ISE>:9060/ers/config/endpoint?filter=mac.EQ.BB:BB:BB:BB:BB:BB
    - 2c. Set the Authorization to Basic Auth and populate the username/pwd details for the ERS Admin created in the ISE instance in Step 1 of this guide:
    
    ![](images/postman2.png)

    - 2d. In the Headers section, add the following
    ![](images/postman3.png)

    - 2e. Click the "Send" button. The output should be similar to below.
    ![](images/postman4).png)
    
    The ID returned is the GUID. We will need to copy this value for the next step.

3. Click the ellipsis next to the existing GET request and create a duplicate, and name it "Endpoint by GUID"
    - 3a. Set the URL value to https://<ISE>:9060/ers/config/endpoint/<GUID>
    ![](images/postman5.png)

    - 3b. Since you duplicated this request, the Authorization and Headers sections are already populated.
    
    - 3c. Click the "Send" button. The output should be similar to below:
    ![](images/postman6.png)

    NOTE: The Custom Attributes fields for this specific endpoint are returned with blank values.

4. Click the ellipsis next to "Endpoint by GUID" and create a duplicate and name it "Update Endpoint by UID"
    - 4a. Set the request type to "PUT" and the URL should remain in the same format as the previous "GET" request (ex. https://<ISE>:9060/ers/config/endpoint/<GUID>
    
    - 4b. We will now be sending additional information in the ERS message, so we need to modify the format. Click on the Headers section and add a value of "Content-Type" with value "application/json"
    ![](images/postman7.png)
    - 4c. Click on the "Body" section. Here we will add values to update for this endpoint including the "true" value for the InventoryStatus, a test SerialNumber value, and the "ServiceNow" for SerialSource.
    ![](images/postman8.png)
    - 4d Click the "Send" button to issue the update. The returned output shows the old values of the record as well as the new values after this update.
    ![](images/postman9.png)

5. Within the ISE GUI, verify that the updates are reflected in the endpoint (Context Visibility -> Endpoints) 
![](images/postmanVerify1.png)

6. Now that we know the ERS functionality is working, let's clear the Custom Attribute values (Edit Endpoint-> click "trash" icon next to each value, click Save") for this endpoint to reset it back to normal. 
![](images/postmanVerify2.png)

We will now perform the ServiceNow steps to do this same ERS update process.

## STEP 6. Create New MID Server Application / Bind App to MID Server on Prem

In ServiceNow, navigate to MID Server -> Applications.

Create the new Application in ServiceNow ("ISE-ERS") and bind it to the MID-Server (ex. "ISE_mid_server")

![](images/midServer1.png)

![](images/midServer2.png)

This will be referenced later

![](images/midServer3.png)

## STEP 7. Create the REST API Queries in ServiceNow

We now need to recreate the API calls we performed in Postman into the ServiceNow API engine. To do this, navigate to Outbound -> REST Message and click "New". This will be the basis of all ISE queries so name it something accordingly:

**Name**: ISE-SVR
**Accessible From**: This application only
**Authentication – Type**: Basic
**Endpoint**: https://<ISE>:9060/ers/config

![](images/snowREST1.png)

Click the search button next to Basic Auth Profile. Click "New" to create a new credential.

![](images/snowREST2.png)

Here you will put in the ERS credentials that were created in ISE during step 1. Then click submit

![](images/snowREST3.png)

![](images/snowREST4.png)

Click on the HTTP Request tab and add the key "Accept" with value "application/json"
![](images/snowREST5.png)

Now that the basic message format is created, we will create the individual calls:

### Create a new HTTP Method called "Get_GUID_By_MAC"

  1. Set the Endpoint HTTP method to be https://<ISE>:9060/ers/config/endpoint
  2. Set Authentication to "Inherit from parent" 
  ![](images/snowRESTcall1.png)
  3. Click the HTTP Request tab. For Use MID Server, click the search button to select your MID Server instance within ServiceNow that will run this request.
  ![](images/snowRESTcall2.png)
  4. Since HTTP headers are inherited from parent, we don't need to define them in this request.
  5. Under the HTTP Query field, double-click to Insert a new row. For the name type "filter" and for the value, type "mac.EQ.${mac}". 
  ![](images/snowRESTcall3.png)
  This value will reference a variable that we will now define.

  6. Under Variable Substitutions, click New. In the next screen, enter "mac" for the name, leave Escape Type to "no escaping" and set the test value to our example MAC address of BB:BB:BB:BB:BB, and then click Submit. 
  ![](images/snowRESTcall4.png)
  ![](images/snowRESTcall5.png)
  7. Now we can perform a test run of the MID server communication to the ISE PAN via ERS call. Under Related Links, click the "Test" button.
  ![](images/snowRESTcall6.png)

  After a few moments, a new screen displays the Test Results including the GUID value (copy this returned output). 
  ![](images/snowRESTcall7.png)

  Find the GUID for the MAC is returned, "9b3cafc….". Copy this value for the next step.

### Create new HTTP Method Called "Get_Endpoint_Details"

  1. Set the following values (replicating steps from the previous method:
  **Name**: GET_Endpoint_Details
  **HTTP Method**: GET
  **Endpoint**: https://<ISE>:9060/ers/config/endpoint/${GUIDendpoint}
  **Authentication Type**: Inherit from Parent
   ![](images/snowHTTPget1.png)

  2. Click the HTTP Request tab and ensure the appropriate MID server is selected.
   ![](images/snowHTTPget2.png)

  3. Under variable Substitutions, click New. In the next screen, enter the following:
  **Name**: GUIDendpoint
  **Test Value**: <sample GUID for example MAC from above>
   ![](images/snowHTTPget3.png)

  4. Click the "Test" button under Related Links and confirm the output looks like the following:
   ![](images/snowHTTPget4.png)

### Create new HTTP Method called "PUT_Endpoint_Update"

  1. Set the following values (replicating steps from the previous method:
  **Name**: "PUT_Endpoint_Update"
  **HTTP Method**: "PUT"
  **Endpoint**: https://<ISE>:9060/ers/config/endpoint/${GUIDendpoint}
  **Authentication Type**: Inherit from Parent

  2. Click the HTTP Request tab and ensure the appropriate MID server is selected.
  ![](images/snowHTTPput1.png)
  Under HTTP Headers, add a new field of "Content-Type" and value "application/json"
  ![](images/snowHTTPput2.png)
  
  3. Under HTTP Query Parameters, add the following into the "Content" window and click Update:
  ```json
  {
    "ERSEndPoint": {
      "id": "${GUIDendpoint}",
      "customAttributes":{
        "customAttributes" :{
          "InventoryStatus" : ${InventoryStatus},
          "SerialNumber": ${SerialNumber},
          "SerialSource": "${SerialSource}"
        }
      }
    }
  }
  ```
  ![](images/snowHTTPput3.png)
  
  4. Scroll down to the Variable Substitutions section. Here we will define (4) variables that will be used in this query (referenced in the code from the previous step):
  **Name**: GUIDendpoint, **value** = GUID **value** from previous query ![](images/snowHTTPput4.png)
  **Name**: Inventory Status, **value** = true
  **Name**: SerialNumber, **value** = 987654 (Serial # different than Postman example)
  **Name**: SerialSource, **value** = ServiceNow
  
  The end result should look like this 
   ![](images/snowHTTPput5.png)

  5. Click the "Test" button under Related Links. The output should look like the following:
   ![](images/snowHTTPput6.png)

### Verify ServiceNow + ISE Integration
To verify the integration worked correctly, once again navigate to Context Visibility -> Endpoints and pull up the same endpoint to see the attributes updated:
 ![](images/snowHTTPputVerify.png)

## STEP 8. Script Automation within ServiceNow

Now that we have successfully tested the REST API calls from ServiceNow to update ISE, we need to automate this process based on ServiceNow workflows. To do this, we need to build two components: a **Script Class**, and a **Business Rule**.  The **Script Class** accepts details from the CMDB, calls the REST messages, and parses the output.  The **Business Rule** defines what actions within ServiceNow will trigger the **Script Class**.

  1. Define the ServiceNow Script Class
  Navigate to "System Definition -> Script Includes" and click "New", name it "ISE_Helper" , select the Accessible from "This Application scope only", check the box for "Active", and then use the script for "ISE Helper" located in this repo. The result should look similar to the screenshot below:
 ![](images/snowAutomation1.png)

  2. Define the ServiceNow Business Rule
  In this scenario, we want the ServiceNow process to run whenever a new Network Adapter entry is added to the ServiceNow CMDB. Other options can be selected per use case.
  
  Navigate to "Business Rules" and click "New". Populate the following fields:
  **Name**: ISE_Network_Adapter
  **Active**: Enabled
  **Advanced**: Enabled
  **When to Run**: When "After" an "Insert"
  ![](images/snowAutomation2.png)

  Click on the "Advanced" tab and add script labeled "ISE_Network_Adapter" located in this repo.  This script will use the information from the Network_Adapter table, send it to the Script Class, and then return the results.

## STEP 9. Testing the Overall Solution

Using our test MAC address from before, let's go back to the ISE dashboard and remove the custom attributes that exist for our test device, BB:BB:BB:BB:BB:BB.

Navigate to Context Visibility -> Endpoints -> select MAC address -> edit endpoint. Open Custom Attributes, and click the small "trash can" icon for each of the three attributes to clear them. Then click Save.
![](images/snowAutomation3.png) ![](images/snowAutomation4.png)

In ServiceNow, navigate to the Configuration -> Computers window to view the active endpoints in the CMDB.

![](images/snowAutomation5.png)

For our example, we will use "Computer1". Click on the computer name to open the Computer record.

![](images/snowAutomation6.png)

**NOTE**: This computer is currently in an "Installed" status and has a serial number of "123456".

Scroll down to the Network Adapters section. This section shows all of the associated MAC addresses with this workstation. In this case, there are no MAC addresses associated to this endpoint, so we will add one.

![](images/snowAutomation7.png)

Click "New" and input the value of "BB:BB:BB:BB:BB:BB" for the MAC address field. The other fields are not necessary to modify at this time. Click the "Submit" button.

![](images/snowAutomation8.png)

After clicking "Submit", recall that this is an Insertion into the Network Adapter table, so therefore the Business Rule will be triggered on the backend. After a few moments, you will see the result of the API calls:

![](images/snowAutomation9.png)

In this case, we see the "PASS" for the update of the MAC address of "BB:BB:BB:BB:BB:BB".

Again, verify in ISE by going to Context Visibility -> Endpoints and view the details of that MAC address.

![](images/snowAutomation10.png)

As soon as the device re-authenticates, it will now hit the Policy Condition that we created earlier that will check the "InventoryStatus = true". **NOTE**: This does not happen automatically. The client re-auth can either be initiated by the client (disconnect/reconnect, or timed re-auth), or manually triggered CoA by an admin through the ISE Admin console.

In this case, we were using a test MAC address so we can't show the live logs of this MAC, but here is an example of an actual device who's access was modified by this same process after re-authentication:

![](images/snowAutomation11.png)

## TROUBLESHOOTING

**Scenario 1 - ISSUE**: ServiceNow updates ISE fields, but sets InventoryStatus to "False" instead of "True".

**Scenario 1 - SOLUTION:** Verify that the computer object within ServiceNow has a Status value set to "Installed". The Script Class is configured to utilize this property when updating NICs. This means that if you have the variable set to another value, (ex. Absent), then ServiceNow will interpret this as an object that is not in the inventory. For example, the Computer object below would update SerialNumber details, but set Inventory Status to "False"

![](images/tshoot1-1.png) ![](images/shoot1-2.png)

Also, the message dialog after an ISE update should reflect this behavior with "Inventory Status: FAIL"

![](images/tshoot1-3.png)

**Scenario 2 - ISSUE**: Receive "No response" for ECC Message Request within ServiceNow

![](images/tshoot2-1.png)

**Scenario 2 - SOLUTION**: Verify that the MID Server associated to the ISE REST messages is currently in a running state.

Navigate to Outbound -> REST Message -> ISE_Helper -> Get_GUI_By_MAC method

Click on the "HTTP Request Tab" and next to USE MID Server, hover over the "Info" button to see the current status of the MID Server.

![](images/tshoot2-2.png)

If the Server Status is "Down" but you have verified the box is online, make sure the MID Service is running on the Server (Start -> Services -> ServiceNow MID Server_ISE_<name>)

![](images/tshoot2-3.png)

**If the service is not running, right click and select "Start". Wait a few moments, refresh the ServiceNow page and check the status again:**
![](images/tshoot2-4.png)

**Scenario 3**: Receive HTTP response other than 200.

**SOLUTION** : Verify configuration of required queries/headers for REST message.  Recreate/debug with Postman as necessary.

##AUTHOR

Taylor Cook (Cisco)