<cfset Term = #UCase(url.term)# & "%">

<cfquery name="qOperators" datasource="plss">
    select
        distinct curr_operator
    from
        oilgas_wells
    where
        upper(curr_operator) like '#Term#'
    order by
        curr_operator
</cfquery>

<cfoutput>
    [
    <cfloop query="qOperators">
        <cfif qOperators.currentrow neq qOperators.recordcount>
            "#curr_operator#",
        <cfelse>
            <!--- omit final comma: --->
            "#curr_operator#"
        </cfif>
    </cfloop>
    ]
</cfoutput>
