/* Formulaire de contact court.
   Envoi par e-mail via FormSubmit (aucun serveur). Le sujet donne la
   priorité du lead (chaud si les choix sont à arrêter dans les 3 mois) ;
   le corps contient une ligne « CRM » séparée par des tabulations,
   prête à coller dans un tableur ou un CRM. */
(function () {
  var DESTINATAIRE = 'hervepeitrequin@gmail.com';
  var ENDPOINT = 'https://formsubmit.co/ajax/' + DESTINATAIRE;

  var form = document.getElementById('lead');
  if (!form) return;
  var erreur = form.querySelector('.erreur');
  var bouton = form.querySelector('[type="submit"]');
  var merci = document.querySelector('.merci');

  function val(nom) {
    var champs = form.querySelectorAll('[name="' + nom + '"]');
    if (!champs.length) return '';
    if (champs[0].type === 'radio' || champs[0].type === 'checkbox') {
      return Array.prototype.filter.call(champs, function (x) { return x.checked; })
        .map(function (x) { return x.value; }).join(', ');
    }
    return champs[0].value.trim();
  }

  function valider() {
    var manque = [];
    form.querySelectorAll('.invalide').forEach(function (el) { el.classList.remove('invalide'); });

    form.querySelectorAll('.choix').forEach(function (groupe) {
      var requis = groupe.dataset.requis || groupe.querySelector('[required]');
      if (requis && !groupe.querySelector('input:checked')) {
        groupe.classList.add('invalide');
        manque.push(groupe.closest('fieldset').querySelector('legend').firstChild.textContent.trim());
      }
    });
    form.querySelectorAll('.champ input[required]').forEach(function (i) {
      var v = i.value.trim();
      if (!v || (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
        i.classList.add('invalide');
        manque.push(i.labels[0].firstChild.textContent.trim());
      }
    });

    if (manque.length) {
      erreur.textContent = 'Il manque : ' + manque.join(', ').toLowerCase().replace(/ \?/g, '') + '.';
      var premier = form.querySelector('.invalide input, input.invalide');
      if (premier) premier.focus();
      return false;
    }
    erreur.textContent = '';
    return true;
  }

  form.addEventListener('input', function (e) {
    e.target.classList.remove('invalide');
    var g = e.target.closest('.choix');
    if (g) g.classList.remove('invalide');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!valider()) return;
    if (form.querySelector('[name="_honey"]').value) return; // robot

    var d = {
      projet: val('projet'), echeance: val('echeance'), preoccupation: val('preoccupation'),
      message: val('message'), nom: val('nom'), email: val('email'), telephone: val('telephone')
    };
    var priorite = d.echeance === 'Plus tard' ? 'tiède' : 'chaud';
    var date = new Date().toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' });
    var colonnes = [date, priorite, d.nom, d.email, d.telephone, d.projet, d.echeance,
      d.preoccupation, d.message.replace(/\s+/g, ' ')];

    var charge = {
      _subject: '[Lead ' + priorite + '] ' + d.projet + ' · ' + d.echeance + ' · ' + d.preoccupation + ' · ' + d.nom,
      _template: 'table',
      _captcha: 'false',
      _replyto: d.email,
      'Priorité': priorite,
      'Nom': d.nom, 'E-mail': d.email, 'Téléphone': d.telephone || '—',
      'Projet': d.projet, 'Échéance des choix': d.echeance,
      'Préoccupations': d.preoccupation, 'Message': d.message || '—',
      'Ligne CRM (à coller dans un tableur)': colonnes.join('\t')
    };

    bouton.disabled = true;
    bouton.firstChild.textContent = 'Envoi en cours… ';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(charge)
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || String(j.success) !== 'true') throw j; }); })
      .then(function () {
        form.hidden = true;
        var prenom = d.nom.split(/\s+/)[0];
        merci.querySelector('.merci-prenom').textContent = prenom ? ', ' + prenom : '';
        merci.hidden = false;
        merci.focus();
      })
      .catch(function () {
        // Secours : le visiteur envoie le même contenu depuis sa messagerie
        var corps = Object.keys(charge).filter(function (k) { return k.charAt(0) !== '_' && k.indexOf('Ligne CRM') !== 0; })
          .map(function (k) { return k + ' : ' + charge[k]; }).join('\n');
        erreur.innerHTML = 'L’envoi n’a pas abouti. <a href="mailto:' + DESTINATAIRE + '?subject=' +
          encodeURIComponent(charge._subject) + '&body=' + encodeURIComponent(corps) +
          '">Envoyez votre demande par e-mail</a>, elle est déjà remplie.';
        bouton.disabled = false;
        bouton.firstChild.textContent = 'Envoyer ma demande ';
      });
  });
})();
