<cfset Term = #UCase(url.term)# & "%">

<cfquery name="qLeaseOperators" datasource="plss">
    select
        distinct OPERATOR_NAME
    from
        nomenclature.leases
    where
        upper(operator_name) like '#Term#'
    order by
        operator_name
</cfquery>

<cfoutput>
    [
    <cfloop query="qLeaseOperators">
        <cfif qLeaseOperators.currentrow neq qLeaseOperators.recordcount>
            "#operator_name#",
        <cfelse>
            <!--- omit final comma: --->
            "#operator_name#"
        </cfif>
    </cfloop>
    ]
</cfoutput>
