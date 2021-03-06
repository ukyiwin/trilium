import utils from "./services/utils.js";

function SetupModel() {
    if (syncInProgress) {
        setInterval(checkOutstandingSyncs, 1000);
    }

    const serverAddress = location.protocol + '//' + location.host;

    $("#current-host").html(serverAddress);

    this.step = ko.observable(syncInProgress ? "sync-in-progress" : "setup-type");
    this.setupType = ko.observable();

    this.setupNewDocument = ko.observable(false);
    this.setupSyncFromDesktop = ko.observable(false);
    this.setupSyncFromServer = ko.observable(false);

    this.username = ko.observable();
    this.password1 = ko.observable();
    this.password2 = ko.observable();

    this.syncServerHost = ko.observable();
    this.syncProxy = ko.observable();

    this.instanceType = utils.isElectron() ? "desktop" : "server";

    this.setupTypeSelected = () => !!this.setupType();

    this.selectSetupType = () => {
        this.step(this.setupType());
    };

    this.back = () => {
        this.step("setup-type");

        this.setupType("");
    };

    this.finish = async () => {
        if (this.setupType() === 'new-document') {
            const username = this.username();
            const password1 = this.password1();
            const password2 = this.password2();

            if (!username) {
                showAlert("Username can't be empty");
                return;
            }

            if (!password1) {
                showAlert("Password can't be empty");
                return;
            }

            if (password1 !== password2) {
                showAlert("Both password fields need be identical.");
                return;
            }

            // not using server.js because it loads too many dependencies
            $.post('/api/setup/new-document', {
                username: username,
                password: password1
            }).then(() => {
                window.location.replace("/");
            });
        }
        else if (this.setupType() === 'sync-from-server') {
            const syncServerHost = this.syncServerHost();
            const syncProxy = this.syncProxy();
            const username = this.username();
            const password = this.password1();

            if (!syncServerHost) {
                showAlert("Trilium server address can't be empty");
                return;
            }

            if (!username) {
                showAlert("Username can't be empty");
                return;
            }

            if (!password) {
                showAlert("Password can't be empty");
                return;
            }

            // not using server.js because it loads too many dependencies
            const resp = await $.post('/api/setup/sync-from-server', {
                syncServerHost: syncServerHost,
                syncProxy: syncProxy,
                username: username,
                password: password
            });

            if (resp.result === 'success') {
                this.step('sync-in-progress');

                setInterval(checkOutstandingSyncs, 1000);

                hideAlert();
            }
            else {
                showAlert('Sync setup failed: ' + resp.error);
            }
        }
    };
}

async function checkOutstandingSyncs() {
    const { stats, initialized } = await $.get('/api/sync/stats');

    if (initialized) {
        window.location.replace("/");
    }

    const totalOutstandingSyncs = stats.outstandingPushes + stats.outstandingPulls;

    $("#outstanding-syncs").html(totalOutstandingSyncs);
}

function showAlert(message) {
    $("#alert").html(message);
    $("#alert").show();
}

function hideAlert() {
    $("#alert").hide();
}

ko.applyBindings(new SetupModel(), document.getElementById('setup-dialog'));

$("#setup-dialog").show();