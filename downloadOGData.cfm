<!--- Creates a zip file containing text files for wells, tops, logs, LAS, cuttings, and cores. --->

<cfsetting requestTimeOut = "600" showDebugOutput = "yes">

<cfset WellsFileText = "">

<cfif FindNoCase("kid in", #form.attrWhere#) neq 0>
	<cfset form.attrWhere = Replace(#form.attrWhere#, "kid in", "w.kid in")>
</cfif>
<cfif FindNoCase("kid in", #form.ogComboWhere#) neq 0>
	<cfset form.ogComboWhere = Replace(#form.ogComboWhere#, "kid in", "w.kid in")>
</cfif>

<!--- Wells: --->
<cfquery name="qWellData" datasource="plss">
	select
    	w.kid,
		w.api_number,
        w.lease_name,
        w.well_name,
        w.operator_name,
        w.field_name,
        w.township,
        w.township_direction,
        w.range,
        w.range_direction,
        w.section,
        w.subdivision_4_smallest,
        w.subdivision_3,
        w.subdivision_2,
        w.subdivision_1_largest,
        w.feet_north_from_reference,
        w.feet_east_from_reference,
        w.reference_corner,
        w.spot,
        w.nad27_longitude,
        w.nad27_latitude,
        w.county_code,
        to_char(w.permit_date,'mm/dd/yyyy') as permit_date,
        to_char(w.spud_date,'mm/dd/yyyy') as spud_date,
        to_char(w.completion_date,'mm/dd/yyyy') as completion_date,
        to_char(w.plug_date,'mm/dd/yyyy') as plug_date,
        w.status,
        w.well_class,
        w.rotary_total_depth,
        w.elevation_kb,
        w.elevation_df,
        w.elevation_gl,
        w.producing_formation,
        o.operator_name as current_op,
        c.name as county
    from
    	oilgas_wells w,
        nomenclature.operators o,
        global.counties c
    where
    	w.operator_kid = o.kid(+)
      	and
      	w.county_code = c.code
		<cfif #form.type# eq "d">
			and
			w.nad83_longitude > #form.xmin# and w.nad83_longitude < #form.xmax# and w.nad83_latitude > #form.ymin# and w.nad83_latitude < #form.ymax#
		<cfelse>
			and
			w.nad27_latitude = (select nad27_latitude from oilgas_wells where KID = #form.kid#)
			and
			w.nad27_longitude = (select nad27_longitude from oilgas_wells where kid = #form.kid#)
		</cfif>
		<cfif IsDefined("form.ogComboWhere") and form.ogComboWhere neq "">
			and
			#PreserveSingleQuotes(form.ogCombowhere)#
		<cfelseif IsDefined("form.attrWhere") and form.attrWhere neq "">
			and
			#PreserveSingleQuotes(form.attrWhere)#
		</cfif>
</cfquery>

<cfif IsDefined("qWellData") AND #qWellData.recordcount# gt 0>
	<cfset TimeStamp = "#hour(now())##minute(now())##second(now())#">
	<cfset WellsFileName = "Wells_#TimeStamp#.csv">
	<cfset WellsOutputFile = "\\vmpyrite\d$\webware\Apache\Apache2\htdocs\kgsmaps\oilgas\output\#WellsFileName#">

	<cfset Columns = "KID,API,LEASE_NAME,WELL_NAME,ORIG_OPERATOR,CURR_OPERATOR,FIELD_NAME,TOWNSHIP,TOWNSHIP_DIR,RANGE,RANGE_DIR,SECTION,SPOT,SUBDIVISION_4_SMALLEST,SUBDIVISION_3,SUBDIVISION_2,SUBDIVISION_1_LARGEST,FEET_NORTH,FEET_EAST,REFERENCE_CORNER,NAD27_LONGITUDE,NAD27_LATITUDE,COUNTY,PERMIT_DATE,SPUD_DATE,COMPLETION_DATE,PLUG_DATE,WELL_TYPE,STATUS,TOTAL_DEPTH,ELEVATION,ELEVATION_REFERENCE,PRODUCING_FORMATION">
	<cffile action="write" file="#WellsOutputFile#" output="#Columns#" addnewline="yes">

	<cfloop query="qWellData">
		<!--- Format elevation value: --->
		<cfif #elevation_kb# neq "">
			<cfset Elev = #elevation_kb#>
			<cfset ElevRef = "KB">
		<cfelseif #elevation_df# neq "">
			<cfset Elev = #elevation_df#>
			<cfset ElevRef = "DF">
		<cfelseif #elevation_gl# neq "">
			<cfset Elev = #elevation_gl#>
			<cfset ElevRef = "GL">
		<!---<cfelseif #elevation# neq "">
			<cfset Elev = #elevation#>
			<cfset ElevRef = "EST">--->
		<cfelse>
			<cfset Elev = "">
			<cfset ElevRef = "">
	    </cfif>

		<cfset Record = '"#kid#","#api_number#","#lease_name#","#well_name#","#operator_name#","#current_op#","#field_name#","#township#","#township_direction#","#range#","#range_direction#","#section#","#spot#","#subdivision_4_smallest#","#subdivision_3#","#subdivision_2#","#subdivision_1_largest#","#feet_north_from_reference#","#feet_east_from_reference#","#reference_corner#","#nad27_longitude#","#nad27_latitude#","#county#","#permit_date#","#spud_date#","#completion_date#","#plug_date#","#status#","#well_class#","#rotary_total_depth#","#Elev#","#ElevRef#","#producing_formation#"'>
		<cffile action="append" file="#WellsOutputFile#" output="#Record#" addnewline="yes">
	</cfloop>
	<cfset WellsFileText = "Download Well Data File">
<cfelse>
	<cfset WellsFileText = "No well data for this search">
</cfif>

<!--- Create temporary table of KIDs for use in subsequent queries (workaround for problem of Oracle's 1000 item limit in lists): --->
<cfquery name="qKIDView" datasource="plss">
    create table ogv#TimeStamp#(kid number)
</cfquery>

<cfloop query="qWellData">
	<cfquery name="qInsertKID" datasource="plss">
		insert into ogv#TimeStamp#
    	values(#kid#)
    </cfquery>
</cfloop>


<!--- Tops: --->
<cfquery name="qTopsData" datasource="plss">
	select
    	w.kid,
        w.api_number,
        w.nad27_longitude,
        w.nad27_latitude,
        w.elevation_kb,
        w.elevation_df,
        w.elevation_gl,
        t.formation_name,
        t.depth_top,
        t.depth_base,
        t.data_source,
        to_char(t.update_date,'mm/dd/yyyy') as update_date
    from
    	oilgas_wells w, qualified.well_tops t
    where
    	w.kid in (select kid from ogv#TimeStamp#)
        and
    	w.kid = t.well_header_kid
</cfquery>

<cfif qTopsData.recordcount gt 0>
	<cfset TopsFileName = "Tops_#TimeStamp#.csv">
    <cfset TopsOutputFile = "\\vmpyrite\d$\webware\Apache\Apache2\htdocs\kgsmaps\oilgas\output\#TopsFileName#">

	<cfset Columns = "KID,API,nad27_longitude,nad27_latitude,ELEVATION,ELEVATION_REFERENCE,FORMATION,TOP,BASE,SOURCE,UPDATED">
	<cffile action="write" file="#TopsOutputFile#" output="#Columns#" addnewline="yes">

    <cfloop query="qTopsData">
        <!--- Format elevation value: --->
        <cfif #elevation_kb# neq "">
            <cfset Elev = #elevation_kb#>
            <cfset ElevRef = "KB">
        <cfelseif #elevation_df# neq "">
            <cfset Elev = #elevation_df#>
            <cfset ElevRef = "DF">
        <cfelseif #elevation_gl# neq "">
            <cfset Elev = #elevation_gl#>
            <cfset ElevRef = "GL">
        <!---<cfelseif #elevation# neq "">
            <cfset Elev = #elevation#>
            <cfset ElevRef = "EST">--->
        <cfelse>
            <cfset Elev = "">
            <cfset ElevRef = "">
        </cfif>

        <cfset Record = '"#kid#","#api_number#","#nad27_longitude#","#nad27_latitude#","#Elev#","#ElevRef#","#formation_name#","#depth_top#","#depth_base#","#data_source#","#update_date#"'>
        <cffile action="append" file="#TopsOutputFile#" output="#Record#" addnewline="yes">
    </cfloop>
</cfif>


<!--- Logs: --->
<cfquery name="qLogData" datasource="plss">
	select
      h.well_header_kid AS KID,
      'T'||w.township||w.township_direction||' R'||w.range||w.range_direction||', Sec. '||w.section||', '||w.spot||' '||w.subdivision_4_smallest||' '||w.subdivision_3||' '||w.subdivision_2 ||' '||w.subdivision_1_largest as LOCATION,
      w.operator_name AS OPERATOR,
      n.operator_name as CURROPERATOR,
      w.lease_name||' '||w.well_name as LEASE,
      w.api_number as API,
      w.elevation_kb,
      w.elevation_df,
      w.elevation_gl,
      l.logger_name as LOGGER,
      t.tool_desc AS TOOL,
      h.top as TOP,
      h.bottom as BOTTOM,
      h.bhtemp as TEMP,
      s.path_string AS SCAN,
      h.log_date as LOGDATE
    from
      elog.log_headers h,
      oilgas_wells w,
      nomenclature.operators n,
      elog.loggers l,
      elog.tools t,
      elog.scan_urls s
    where
      h.well_header_kid in (select kid from ogv#TimeStamp#)
      AND
      w.kid = h.well_header_kid
      AND
      h.logger_id = l.logger_id
      AND
      h.logger_id = t.logger_id
      AND
      h.tool_id = t.tool_id
      AND
      h.kid = s.log_header_kid(+)
      and
      w.operator_kid = n.kid(+)
</cfquery>

<cfif qLogData.recordcount gt 0>
	<cfset LogFileName = "Logs_#TimeStamp#.csv">
    <cfset LogOutputFile = "\\vmpyrite\d$\webware\Apache\Apache2\htdocs\kgsmaps\oilgas\output\#LogFileName#">

	<cfset Columns = "KID,LOCATION,ORIGINAL-OPERATOR,CURRENT-OPERATOR,LEASE,API,ELEVATION,LOGGER,TOOL,TOP,BOTTOM,TEMP,SCANNED,LOG_DATE">
	<cffile action="write" file="#LogOutputFile#" output="#Columns#" addnewline="yes">

    <cfloop query="qLogData">
        <!--- Format elevation value: --->
        <cfif #elevation_kb# neq "">
            <cfset Elev = #elevation_kb#>
            <cfset ElevRef = "KB">
        <cfelseif #elevation_df# neq "">
            <cfset Elev = #elevation_df#>
            <cfset ElevRef = "DF">
        <cfelseif #elevation_gl# neq "">
            <cfset Elev = #elevation_gl#>
            <cfset ElevRef = "GL">
        <!---<cfelseif #elevation# neq "">
            <cfset Elev = #elevation#>
            <cfset ElevRef = "EST">--->
        <cfelse>
            <cfset Elev = "">
            <cfset ElevRef = "">
        </cfif>

        <!--- Format scan value: --->
        <cfif #SCAN# neq "">
            <cfset Scanned = "Scanned">
        <cfelse>
            <cfset Scanned = "Unscanned">
        </cfif>

        <cfset Record = '"#KID#","#LOCATION#","#OPERATOR#","#CURROPERATOR#","#LEASE#","#API#","#Elev# #ElevRef#","#LOGGER#","#TOOL#","#TOP#","#BOTTOM#","#TEMP#","#Scanned#","#DateFormat(LOGDATE,'MM/DD/YYYY')#"'>
        <cffile action="append" file="#LogOutputFile#" output="#Record#" addnewline="yes">
    </cfloop>
</cfif>


<!--- LAS: --->
<cfquery name="qLASData" datasource="plss">
	select
      well_header_kid AS KID,
      las_filename as LASFILE
    from
      las.well_headers
    where
      well_header_kid in (select kid from ogv#TimeStamp#)
</cfquery>

<cfif qLASData.recordcount gt 0>
	<cfset LASFileName = "LAS_#TimeStamp#.csv">
    <cfset LASOutputFile = "\\vmpyrite\d$\webware\Apache\Apache2\htdocs\kgsmaps\oilgas\output\#LASFileName#">

	<cfset Columns = "KID,LASFILE">
	<cffile action="write" file="#LASOutputFile#" output="#Columns#" addnewline="yes">

    <cfloop query="qLASData">
        <cfset Record = '"#KID#","#LASFILE#"'>
        <cffile action="append" file="#LASOutputFile#" output="#Record#" addnewline="yes">
    </cfloop>
</cfif>


<!--- Cuttings: --->
<cfquery name="qCuttingsData" datasource="plss">
	select
    	well_header_kid,
    	box_id,
        depth_start,
        depth_stop
    from
    	cuttings.boxes
    where
    	well_header_kid in (select kid from ogv#TimeStamp#)
</cfquery>

<cfif qCuttingsData.recordcount gt 0>
	<cfset CuttingsFileName = "Cuttings_#TimeStamp#.csv">
    <cfset CuttingsOutputFile = "\\vmpyrite\d$\webware\Apache\Apache2\htdocs\kgsmaps\oilgas\output\#CuttingsFileName#">

	<cfset Columns = '"KID","BOX_NUMBER","STARTING_DEPTH","ENDING_DEPTH"'>
	<cffile action="write" file="#CuttingsOutputFile#" output="#Columns#" addnewline="yes">

    <cfloop query="qCuttingsData">
        <cfset Record = '"#well_header_kid#","#box_id#","#depth_start#","#depth_stop#"'>
        <cffile action="append" file="#CuttingsOutputFile#" output="#Record#" addnewline="yes">
    </cfloop>
</cfif>


<!--- Cores: --->
<cfquery name="qCoreData" datasource="plss">
	select
    	h.well_header_kid as KID,
  		b.barcode as BARCODE,
  		b.facility as FACILITY,
  		b.storage_aisle as AISLE,
  		b.storage_column as STORCOL,
  		b.storage_row as STORROW,
  		b.segment_top as TOP,
        b.segment_bot as BOTTOM,
        b.coretype as CORETYPE,
        b.comments as COMM
	from
    	core.core_headers h,
  		core.core_boxedsegments b
	where
  		h.well_header_kid in (select kid from ogv#TimeStamp#)
  		and
  		h.kid = b.corehdrkid
</cfquery>

<cfif qCoreData.recordcount gt 0>
	<cfset CoreFileName = "Core_#TimeStamp#.csv">
    <cfset CoreOutputFile = "\\vmpyrite\d$\webware\Apache\Apache2\htdocs\kgsmaps\oilgas\output\#CoreFileName#">

	<cfset Columns = "KID,BARCODE,FACILITY,AISLE,COLUMN,ROW,TOP,BOTTOM,CORE_TYPE,COMMENTS">
	<cffile action="write" file="#CoreOutputFile#" output="#Columns#" addnewline="yes">

    <cfloop query="qCoreData">
        <cfset Record = '"#KID#","#BARCODE#","#FACILITY#","#AISLE#","#STORCOL#","#STORROW#","#TOP#","#BOTTOM#","#CORETYPE#","#COMM#"'>
        <cffile action="append" file="#CoreOutputFile#" output="#Record#" addnewline="yes">
    </cfloop>
</cfif>


<!--- Create zip file: --->
<cfzip action="zip"
	source="\\vmpyrite\d$\webware\Apache\Apache2\htdocs\kgsmaps\oilgas\output"
    file="\\vmpyrite\d$\webware\Apache\Apache2\htdocs\kgsmaps\oilgas\output\oilgas_#TimeStamp#.zip"
    filter="*#TimeStamp#*"
    overwrite="yes" >


<!--- Delete temporary KID table: --->
<cfquery name="qDeleteOGV" datasource="plss">
	drop table ogv#TimeStamp#
</cfquery>


<!--- xhr response text: --->
<cfoutput>
	<cfif FileExists(#WellsOutputFile#)>
		<cfif #form.type# eq "d">
		    <cfif FindNoCase("Download", #WellsFileText#) neq 0>
				<div class="download-link"><a href="http://vmpyrite.kgs.ku.edu/KgsMaps/oilgas/output/oilgas_#TimeStamp#.zip"><span class="esri-icon-download"></span>#WellsFileText#</a></div>
			<cfelse>
				<div class="download-link">#WellsFileText#</div>
			</cfif>
		<cfelse>
			<cfif FindNoCase("Download", #WellsFileText#) neq 0>
				oilgas_#TimeStamp#.zip
			<cfelse>
				"no file"
			</cfif>
		</cfif>
	<cfelse>
		<span style="font:normal normal normal 12px arial">An error has occurred - file was not created.</span>
	</cfif>
</cfoutput>
