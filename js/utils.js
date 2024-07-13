$(document).ready(function() {
    $('#encrypt').on('submit', function() {
        const message = $('#message').val();
        encrypt(message)
            .then(result => $('#result').val(result))
            .catch(() => alert('Error in some fields'));

        return false;
    });

    $('#decrypt').on('submit', function() {
        const passphrase = $('#passphrase').val();
        $('#passphrase').val('');
        const message = $('#message').val();
        decrypt(message, passphrase)
            .then(result => $('#result').val(result))
            .catch(() => alert('Error in some fields'));

        return false;
    });

    $('#sign').on('submit', function() {
        const passphrase = $('#passphrase').val();
        const message = $('#message').val();
        sign(message, passphrase)
            .then(result => $('#result').val(result))
            .catch(() => alert('Error in some fields'));

        return false;
    });

    $('#verify').on('submit', function() {
        const message = $('#message').val();
        verify(message)
            .then(result => {
                const text = [
                    'Valid message!',
                    'Hex: '+result,
                ].join('\n');
                $('#result').text(text);
            })
            .catch(() => alert('Error in some fields'));

        return false;
    });

    $('#generate').on('submit', function() {
        const name = $('#name').val();
        const email = $('#email').val();
        const passphrase = $('#passphrase').val();

        generate(name, email, passphrase)
            .then(result => {
                if (result && result.pub && result.priv) {
                    $('#pubkey').val(result.pub);
                    $('#privkey').val(result.priv);
                } else {
                    alert('Error');
                }
            })
            .catch(() => alert('Error in some fields'));

        return false;
    });
});

let loadKey = async type => {
    const files = $('#key').prop('files');
    if (files.length === 0) {
        alert('Add a ' + type + ' key to encrypt');
        return;
    }
    return await files[0].text();
};

async function encrypt(message) {
    const pubKey = await loadKey('public');
    const options = {
        message: openpgp.message.fromText(message),
        publicKeys: (await openpgp.key.readArmored(pubKey)).keys,
    };

    return new Promise((resolve, reject) => {
        openpgp.encrypt(options)
            .then(ciphertext => {
                resolve(ciphertext.data);
            })
            .catch(reject);
    });
}

async function decrypt(message, passphrase) {
    const privKey = await loadKey('private');
    const privKeyObj = (await openpgp.key.readArmored(privKey)).keys[0];
    await privKeyObj.decrypt(passphrase);

    const options = {
        message: await openpgp.message.readArmored(message),
        privateKeys: [privKeyObj],
    };

    return new Promise((resolve, reject) => {
        openpgp.decrypt(options)
            .then(plaintext => {
                resolve(plaintext.data);
            })
            .catch(reject);
    });
}

async function sign(message, passphrase) {
    const privKey = await loadKey('private');
    const privKeyObj = (await openpgp.key.readArmored(privKey)).keys[0];
    await privKeyObj.decrypt(passphrase);

    const options = {
        message: openpgp.cleartext.fromText(message),
        privateKeys: [privKeyObj],
    };

    return new Promise((resolve, reject) => {
        openpgp.sign(options)
            .then(function(signed) {
                resolve(signed.data);
            })
            .catch(reject);
    });
}

async function verify(message) {
    const pubKey = await loadKey('public');
    const options = {
        message: await openpgp.cleartext.readArmored(message),
        publicKeys: (await openpgp.key.readArmored(pubKey)).keys,
    };

    return new Promise((resolve, reject) => {
        openpgp.verify(options)
            .then(function(verified) {
                const validity = verified.signatures[0].valid;
                if (validity) {
                    resolve(verified.signatures[0].keyid.toHex());
                } else {
                    resolve(null);
                }
            })
            .catch(reject);
    });
}

async function generate(name, email, passphrase) {
    const options = {
        userIds: [{ name: name, email: email }],
        numBits: 4096,
        passphrase: passphrase,
    };

    return new Promise((resolve, reject) => {
        openpgp.generateKey(options)
            .then(function(key) {
                resolve({
                    pub: key.publicKeyArmored,
                    priv: key.privateKeyArmored,
                });
            })
            .catch(reject);
    });
}