
<cfset Term = #UCase(url.term)# & "%">


<cfquery name="qWellNames" datasource="plss">
    select
        distinct well_label
    from
        oilgas_wells
    where
        upper(well_label) like '#Term#'
    order by
        well_label
</cfquery>

<cfoutput>
    [
    <cfloop query="qWellNames">
        <cfif qWellNames.currentrow neq qWellNames.recordcount>
            "#well_label#",
        <cfelse>
            <!--- omit final comma: --->
            "#well_label#"
        </cfif>
    </cfloop>
    ]
</cfoutput>
