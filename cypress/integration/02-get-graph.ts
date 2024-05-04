import { e2e } from '@grafana/e2e';
const dashboardUID = 'b6610ab3-816b-4649-9909-a6bf32605b8b';

e2e.scenario({
  describeName: 'Get cubism graph',
  itName: 'Get cubism test',
  scenario: () => {
    e2e.pages.Dashboard.visit(dashboardUID);
    e2e().contains('Panel Title').should('be.visible');
    // Check if there are 20 div elements with the class 'horizon'
    // [id$=-remote]
    e2e().get('div[class$=-horizon]').should('have.length', 20);
    e2e().get('div[class$=-horizon]').first().next().find('span.titleCubism').should('contain', 'A-series1');
    e2e().get('div[class$=-horizon]').first().find('canvas').should('be.visible');
  },
});
