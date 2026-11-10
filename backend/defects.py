"""Opt-in training defects. Keep stable keys for existing instructor settings."""

API_DEFECTS = [
    ('API-01', 'exclude_end_date', 'The missing final day', 'Date filters exclude the final day of an inclusive range.'),
    ('API-02', 'ignore_discounts', 'The inflated total', 'Dashboard revenue uses gross sales instead of net revenue.'),
    ('API-03', 'report_permissions', 'The missing permission check', 'Report deletion skips the ownership check.'),
    ('API-04', 'ignore_region_filter', 'The ignored region', 'Sales selection ignores the requested region.'),
    ('API-05', 'overlap_pages', 'The repeated record', 'Each page after the first starts one record too early.'),
    ('API-06', 'unfiltered_total', 'The misleading count', 'Sales pagination reports the unfiltered record count.'),
    ('API-07', 'lose_updated_discount', 'The unchanged discount', 'Sale updates retain the previous discount.'),
    ('API-08', 'export_all_regions', 'The oversized export', 'CSV export ignores the saved report region.'),
    ('API-09', 'logout_keeps_session', 'The reusable session', 'Logout leaves the bearer token valid.'),
    ('API-10', 'count_rows_as_customers', 'The duplicated customers', 'Dashboard customer count counts rows instead of distinct names.'),
]

UI_DEFECTS = [
    ('UI-01', 'ui_revenue_offset', 'The incorrect revenue display', 'The revenue card adds 1,000 to the API value.'),
    ('UI-02', 'ui_orders_from_customers', 'The swapped metric', 'The orders card displays the customer count.'),
    ('UI-03', 'ui_wrong_region', 'The wrong region selection', 'Selecting Europe requests North America.'),
    ('UI-04', 'ui_stuck_next_page', 'The stuck next page', 'The Next button leaves the current page unchanged.'),
    ('UI-05', 'ui_zero_discount', 'The lost form value', 'Sale forms submit zero instead of the entered discount.'),
    ('UI-06', 'ui_report_name_prefill', 'The altered report name', 'Editing a report pre-fills its name with an extra suffix.'),
    ('UI-07', 'ui_cancel_deletes', 'The destructive cancel', 'Cancel in a delete dialog deletes the selected record.'),
    ('UI-08', 'ui_hide_filter_error', 'The missing filter feedback', 'Overview and Sales data hide request error alerts.'),
    ('UI-09', 'ui_csv_extension', 'The wrong download name', 'CSV downloads use a .txt extension.'),
    ('UI-10', 'ui_escape_ignored', 'The unresponsive dialog', 'Escape does not close a nonbusy dialog.'),
]

DEFECTS = {key: description for _, key, _, description in API_DEFECTS + UI_DEFECTS}


def catalogue():
    return {
        group: [dict(id=ident, key=key, title=title, description=description)
                for ident, key, title, description in entries]
        for group, entries in [('api', API_DEFECTS), ('ui', UI_DEFECTS)]
    }
