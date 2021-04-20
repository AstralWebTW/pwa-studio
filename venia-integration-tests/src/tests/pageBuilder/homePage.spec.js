/// <reference types="cypress" />

const captureSnapshots = (index, num, options) => {
    if (!num) {
        return;
    }

    const { scrollByPx, testName } = options;
    const snapName = `${testName} - Screenshot ${index}`;

    cy.screenshot(snapName, {
        capture: 'viewport'
    })
        .toMatchImageSnapshot()
        .then(() => {
            cy.scrollTo('0px', `${scrollByPx * index}px`);

            cy.wait(1000);

            captureSnapshots(index + 1, num - 1, options);
        });
};

const captureFullPageSnapshot = testName => {
    cy.document().then(doc => {
        const docElm = doc.documentElement;
        const { scrollHeight, clientHeight } = docElm;
        const numOfScrolls = Math.ceil(scrollHeight / clientHeight);

        captureSnapshots(1, numOfScrolls, {
            scrollByPx: clientHeight,
            testName
        });
    });
};

context('Assert Venia Home Page pagebuilder content', () => {
    describe('Assert Page Builder content', () => {
        it('should render page builder content correctly', () => {
            cy.visit('/default/venia-tops.html?page=1');

            cy.wait(3000);

            captureFullPageSnapshot(
                'should render page builder content correctly'
            );
        });
    });
});
