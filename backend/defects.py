"""Instructor catalogue. Keys are stable so saved training settings keep working."""
CATALOGUE = [
    ('API-01','exclude_end_date','The missing final day','Date filters exclude the selected final day.','Query sales from 2026-01-01 to 2026-01-01 on the seed.','One sale, not zero.'),
    ('API-02','ignore_discounts','The inflated total','Dashboard revenue ignores discounts.','Sum net revenue from every sales page and compare with the dashboard.','Both totals equal 471180 on the unchanged seed.'),
    ('API-03','report_permissions','The missing permission check','Analysts can delete another user’s report.','As Sam, DELETE /api/reports/1.','403; the admin-owned report remains.'),
    ('API-04','pagination_overlap','The repeated record','Adjacent sales pages overlap by one record.','Compare IDs on sales pages 1 and 2 with page_size=10.','No shared IDs; page 2 begins with ID 11 on the seed.'),
    ('API-05','wrong_filtered_total','The unfiltered count','Sales pagination total ignores active filters.','GET /api/sales?region=Europe&page_size=100.','total equals the matching record count (30 on the seed).'),
    ('API-06','missing_sale_success','The successful missing record','Reading a missing sale returns 200 with an empty object.','GET /api/sales/999999 on the seed.','404 with a Sale not found error.'),
    ('API-07','sale_update_ignored_discount','The forgotten discount','Updating a sale silently retains the old discount.','Create a sale with discount 10; PUT the same sale with discount 20; GET it.','The persisted discount is 20.'),
    ('API-08','export_ignores_region','The mixed-region export','Report CSV export ignores the saved region.','Create a Europe-only report without dates and export its CSV.','Every exported row is European.'),
    ('API-09','report_create_wrong_status','The wrong creation status','Creating a report returns 200 instead of 201.','POST /api/reports with a valid name.','201 Created with the new report body.'),
    ('API-10','customer_count_orders','The overcounted customers','Dashboard customer count counts orders instead of distinct customers.','GET /api/dashboard on the unchanged seed.','5 customers, not 120.'),
    ('UI-01','ui_region_ignored','The decorative region filter','The browser omits the selected region from its queries.','Select Europe on Overview. Compare the UI and a direct Europe API query.','The overview shows 30 orders, not all 120.'),
    ('UI-02','ui_clear_keeps_region','The sticky region','Clear filters leaves the selected region in place.','Select Europe, wait for data, then click Clear.','All regions is selected and 120 orders return on the seed.'),
    ('UI-03','ui_next_page_stuck','The stuck Next button','Next does not advance the sales page.','On Sales data page 1, click Next.','Page 2 appears and displays the next ten records.'),
    ('UI-04','ui_previous_page_stuck','The stuck Previous button','Previous does not return to the preceding sales page.','Advance to sales page 2, then click Previous.','Page 1 and its first ten records appear.'),
    ('UI-05','ui_wrong_currency','The wrong currency label','USD amounts are displayed as euros without conversion.','Inspect the dashboard or a sale’s revenue.','Amounts use USD ($), matching the API contract.'),
    ('UI-06','ui_gross_sale_revenue','The misleading row revenue','Sales rows display gross revenue instead of net revenue.','Find seeded sale 2 with a 5% discount and compare its row with GET /api/sales/2.','1691 USD, not 1780 USD.'),
    ('UI-07','ui_report_cancel_saves','The saving Cancel button','Cancel on a valid new-report form creates the report.','Enter a unique report name in Create report, then click Cancel.','The dialog closes without creating a report.'),
    ('UI-08','ui_report_edit_name_ignored','The unchanged report name','Saving a report edit submits the original name.','Edit an owned report, change its name, and Save changes.','The new name is shown and persisted.'),
    ('UI-09','ui_delete_cancel_deletes','The deleting Cancel button','Cancel in a report-deletion dialog deletes the report.','Create a disposable report, click its Delete button, then Cancel.','The report remains; no DELETE request is sent.'),
    ('UI-10','ui_mobile_export_hidden','The missing mobile export','CSV export buttons disappear below 761px viewport width.','Open Reports at a 390px viewport width.','Every report still has a visible Export CSV action.'),
]
DEFECT_CATALOGUE = [dict(id=i,key=k,area='UI' if i.startswith('UI') else 'API',title=t,description=d,reproduction=r,expected=e) for i,k,t,d,r,e in CATALOGUE]
DEFECTS = {entry['key']: entry['description'] for entry in DEFECT_CATALOGUE}
