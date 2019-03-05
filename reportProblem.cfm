<cfif #form.type# eq "wwc5">
	<cfset FType = "WWC5 WELL: ">
<cfelseif #form.type# eq "ogwell">
	<cfset FType = "OIL/GAS WELL: ">
<cfelseif #form.type# eq "earthquake">
	<cfset FType = "EARTHQUAKE EVENT: ">
<cfelseif #form.type# eq "ogfield">
	<cfset FType = "FIELD: ">
</cfif>

<cfoutput>
    <cfmail to = "killion.kgs@gmail.com" from = "killion@kgs.ku.edu" replyto="killion@kgs.ku.edu" subject = "Oil and Gas Mapper Data Problem" type="html">
    	A user has reported a problem with the following:<p>
    	#FType# #form.name#<p>
		KGS ID: #form.id#<p>
    	<cfif #form.otherId# neq "">
    		API: #form.otherId#<p>
    	</cfif>
    	MESSAGE: #form.msg#<p>
    	*** this message is auto-generated by the oil and gas mapper ***
	</cfmail>
</cfoutput>
