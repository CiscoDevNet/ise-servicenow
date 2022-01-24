# ServiceNow Integration with Cisco ISE

## OVERVIEW

This guide is intended to show how to allow the ServiceNow platform to use information from ServiceNow's CMDB to update endpoint records within ISE. This guide will focus on the following use case:

## USE CASE:

A customer has an inventory of their computers in ServiceNow and would like to ensure that only those computers are allowed access to the network. ServiceNow will therefore inform Cisco ISE of the status of computer objects and ISE will have a policy to either drop ping (default) or allow access (if Computuer is in the Inventory). In this case, the ServiceNow database will use the Status field with a value of "Installed"; to indicate a device as being in the inventory (see screenshot):
![images]useCaseExample.png

## REQUIREMENTS:

- ISE v2.4 or later (screenshots are ISE 3.1)
- ServiceNow Instance (Orlando or later)
- ServiceNow MID-Server with access to ISE PSN (TCP 80/443/9060)
  - Instructions on how to install a MID Server can be found [here](https://docs.servicenow.com/bundle/quebec-servicenow-platform/page/product/mid-server/concept/mid-server-installation.html)

## OUTLINE:

# ServiceNow Integration with Cisco ISE

## OVERVIEW

This guide is intended to show how to allow the ServiceNow platform to use information from it&#39;s CMDB to update endpoint records within ISE. This guide will focus on the following use case:

## USE CASE:

A customer has an inventory of their computers in ServiceNow and would like to ensure that only those computers are allowed access to the network. ServiceNow will therefore inform Cisco ISE of the status of computer objects and ISE will have a policy to either drop ping (default) or allow access (if &quot;in inventory&quot;). In this case, the ServiceNow database will use the Status field with a value of &quot;Installed&quot; to indicate a device as being in the inventory (see screenshot):

![](RackMultipart20220124-4-nvp436_html_a1f579b6ae0a0a16.png)

## REQUIREMENTS:

- ISE v2.4 or later (screenshots are ISE 3.1)
- ServiceNow Instance (Orlando or later)
- ServiceNow MID-Server with access to ISE PSN (TCP 80/443/9060)
  - Instructions on how to install a MID Server can be found [here](https://docs.servicenow.com/bundle/quebec-servicenow-platform/page/product/mid-server/concept/mid-server-installation.html)
  - Document MID Server details (used in Step 6)

## OUTLINE:

      1. [Create ERS user account within ISE](#_1._CREATE_ERS)
      2. [Enable ERS Gateway within ISE](#_2._ENABLE_ERS)
      3. [Create Custom Attributes within ISE](#_3._CREATE_CUSTOM)
      4. [Create new Policy Conditions and AuthZ Profile](#_4._CREATE_NEW)
      5. [Verify ERS Functionality via Postman](#_5._Verify_ERS)
      6. [Create MID Server app / Bind App to MID Server on Prem](#_6._CREATE_NEW)
      7. [Create the REST API queries in ServiceNow](#_7._CREATE_THE)
        1. [Get\_GUI\_By\_MAC](#_Create_a_new)
        2. [Get\_Endpoint\_Details](#_Create_new_HTTP)
        3. [Put\_Endpoint\_Update](#_Create_new_HTTP_1)
      8. [Script Automation within ServiceNow](#_8._Script_Automation)
        1. [Defining the ServiceNow Script Class](#_Define_the_ServiceNow)
        2. [Defining the ServiceNow Business Rule](#_Define_the_ServiceNow_1)
      9. [Testing the Overall Solution](#_9._Testing_the)

[Troubleshooting](#_TROUBLESHOOTING)
[Appendix 1](#_APPENDIX_1:_ISE_Helper)
[Appendix 2](#_APPENDEX_2:_ServiceNow)
