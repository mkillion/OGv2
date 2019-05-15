<cfset Term = #UCase(url.term)# & "%">

<cfquery name="qFieldNames" datasource="plss">
    select
        distinct field_name
    from
        oilgas_fields_lam
    where
        upper(field_name) like '#Term#'
    order by
        field_name
</cfquery>

<cfoutput>
    [
    <cfloop query="qFieldNames">
        <cfif qFieldNames.currentrow neq qFieldNames.recordcount>
            "#field_name#",
        <cfelse>
            <!--- omit final comma: --->
            "#field_name#"
        </cfif>
    </cfloop>
    ]
</cfoutput>
