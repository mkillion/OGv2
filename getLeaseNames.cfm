
<cfset Term = #UCase(url.term)# & "%">

<cfquery name="qLeaseNames" datasource="plss">
    select
        distinct LEASE_NAME
    from
        leases
    where
        upper(lease_name) like '#Term#'
    order by
        lease_name
</cfquery>

<cfoutput>
    [
    <cfloop query="qLeaseNames">
        <cfif qLeaseNames.currentrow neq qLeaseNames.recordcount>
            "#lease_name#",
        <cfelse>
            <!--- omit final comma: --->
            "#lease_name#"
        </cfif>
    </cfloop>
    ]
</cfoutput>
