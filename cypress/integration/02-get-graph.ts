import { e2e } from '@grafana/e2e';
const dashboardUID = 'b6610ab3-816b-4649-9909-a6bf32605b8b'

e2e.scenario({
  describeName: 'Get cubism graph',
  itName: 'Get cubism test',
  scenario: () => {
    e2e.pages.Dashboard.visit(dashboardUID)
    e2e().contains('Panel Title').should('be.visible');
    // Check if there are 19 div elements with the class 'horizon'
    e2e().get('div.horizon').should('have.length', 20)
    e2e().get('div.horizon').first().next().find('span.title').should('contain', 'A-series1')
    e2e().get('div.horizon').first().find('canvas').should('be.visible');
  },
});
