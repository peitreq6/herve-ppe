/* Formulaire de qualification en 3 étapes.
   Envoi par e-mail via FormSubmit (aucun serveur) ; le sujet porte la note
   du lead (A chaud / B tiède / C froid) et le corps contient une ligne
   « CRM » séparée par des tabulations, prête à coller dans un tableur ou un CRM. */
(function () {
  var DESTINATAIRE = 'hervepeitrequin@gmail.com';
  var ENDPOINT = 'https://formsubmit.co/ajax/' + DESTINATAIRE;

  var form = document.getElementById('lead');
  if (!form) return;
  var etapes = form.querySelectorAll('.etape-form');
  var pastilles = form.querySelectorAll('.progression li');
  var erreur = form.querySelector('.erreur');
  var btnPrec = form.querySelector('[data-action="precedent"]');
  var btnSuiv = form.querySelector('[data-action="suivant"]');
  var btnEnv = form.querySelector('[data-action="envoyer"]');
  var merci = document.querySelector('.merci');
  var courante = 1;

  function afficher(n) {
    courante = n;
    etapes.forEach(function (e) { e.hidden = Number(e.dataset.etape) !== n; });
    pastilles.forEach(function (p, i) {
      p.classList.toggle('actif', i + 1 === n);
      p.classList.toggle('fait', i + 1 < n);
    });
    btnPrec.hidden = n === 1;
    btnSuiv.hidden = n === etapes.length;
    btnEnv.hidden = n !== etapes.length;
    erreur.textContent = '';
  }

  function valider(n) {
    var bloc = form.querySelector('[data-etape="' + n + '"]');
    var manque = [];
    bloc.querySelectorAll('.invalide').forEach(function (el) { el.classList.remove('invalide'); });

    // Groupes radio obligatoires
    var vus = {};
    bloc.querySelectorAll('input[type="radio"][required]').forEach(function (r) {
      if (vus[r.name]) return;
      vus[r.name] = true;
      if (!form.querySelector('input[name="' + r.name + '"]:checked')) {
        r.closest('.choix').classList.add('invalide');
        manque.push(r.closest('fieldset').querySelector('legend').firstChild.textContent.trim());
      }
    });
    // Champs texte obligatoires
    bloc.querySelectorAll('.champ input[required]').forEach(function (i) {
      if (!i.value.trim() || (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim()))) {
        i.classList.add('invalide');
        manque.push(i.labels[0].firstChild.textContent.trim());
      }
    });
    // Consentement
    var accord = bloc.querySelector('input[name="accord"]');
    if (accord && !accord.checked) {
      accord.closest('.accord').classList.add('invalide');
      manque.push('votre accord pour être recontacté');
    }

    if (manque.length) {
      erreur.textContent = 'Il manque : ' + manque.join(', ').toLowerCase().replace(/ \?/g, '') + '.';
      var premier = bloc.querySelector('.invalide input, input.invalide, .invalide');
      if (premier && premier.focus) premier.focus({ preventScroll: false });
      return false;
    }
    return true;
  }

  // Les .invalide se retirent dès qu'on corrige
  form.addEventListener('input', function (e) {
    var t = e.target;
    t.classList.remove('invalide');
    var c = t.closest('.choix, .accord');
    if (c) c.classList.remove('invalide');
  });

  btnSuiv.addEventListener('click', function () {
    if (valider(courante)) {
      afficher(courante + 1);
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  btnPrec.addEventListener('click', function () { afficher(courante - 1); });

  // Entrée dans un champ texte = étape suivante, pas un envoi prématuré
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && courante < etapes.length) {
      e.preventDefault();
      btnSuiv.click();
    }
  });

  function val(nom) {
    var coches = form.querySelectorAll('[name="' + nom + '"]');
    if (!coches.length) return '';
    if (coches[0].type === 'radio') {
      var c = form.querySelector('[name="' + nom + '"]:checked');
      return c ? c.value : '';
    }
    if (coches[0].type === 'checkbox') {
      return Array.prototype.filter.call(coches, function (x) { return x.checked; })
        .map(function (x) { return x.value; }).join(', ');
    }
    return coches[0].value.trim();
  }

  // Note sur 12 : urgence + maturité + budget + accompagnement
  function noter(d) {
    var pts = {
      echeance: { "Moins d'un mois": 3, '1 à 3 mois': 3, '3 à 6 mois': 2, 'Plus tard': 1, 'Je ne sais pas': 1 },
      stade: { 'Achat signé, finitions à choisir': 3, 'Choix des finitions en cours': 3, 'Travaux en cours': 2, 'En réflexion': 0 },
      budget: { 'Plus de CHF 150\'000': 3, 'CHF 80\'000 à 150\'000': 3, 'CHF 30\'000 à 80\'000': 2, 'Moins de CHF 30\'000': 1, 'Pas encore défini': 1 },
      accompagnement: { 'Un accompagnement complet': 3, 'Je ne sais pas encore': 2, 'Un avis ponctuel': 1 }
    };
    var total = 0;
    Object.keys(pts).forEach(function (k) { total += pts[k][d[k]] || 0; });
    var classe = total >= 9 ? 'A · chaud' : total >= 6 ? 'B · tiède' : 'C · froid';
    return { total: total, classe: classe };
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!valider(courante)) return;
    if (form.querySelector('[name="_honey"]').value) return; // robot

    var d = {
      prenom: val('prenom'), nom: val('nom'), email: val('email'), telephone: val('telephone'),
      preference: val('preference'), projet: val('projet'), stade: val('stade'),
      echeance: val('echeance'), commune: val('commune'), pieces: val('pieces'),
      accompagnement: val('accompagnement'), budget: val('budget'),
      fournisseurs_imposes: val('fournisseurs_imposes'), source: val('source'), message: val('message')
    };
    var note = noter(d);
    var date = new Date().toLocaleString('fr-CH', { dateStyle: 'short', timeStyle: 'short' });
    var colonnes = [date, 'Lead ' + note.classe, note.total, d.prenom, d.nom, d.email, d.telephone,
      d.preference, d.projet, d.stade, d.echeance, d.commune, d.pieces, d.accompagnement,
      d.budget, d.fournisseurs_imposes, d.source, d.message.replace(/\s+/g, ' ')];

    var charge = {
      _subject: '[Lead ' + note.classe + '] ' + d.projet + (d.commune ? ' · ' + d.commune : '') + ' · ' + d.echeance + ' · ' + d.prenom + ' ' + d.nom,
      _template: 'table',
      _captcha: 'false',
      _replyto: d.email,
      'Note du lead': 'Lead ' + note.classe + ' (' + note.total + '/12)',
      'Prénom': d.prenom, 'Nom': d.nom, 'E-mail': d.email, 'Téléphone': d.telephone || '—',
      'Préférence de contact': d.preference,
      'Projet': d.projet, 'Stade': d.stade, 'Échéance des choix': d.echeance, 'Commune': d.commune || '—',
      'Pièces concernées': d.pieces || '—', 'Accompagnement souhaité': d.accompagnement,
      'Budget finitions': d.budget, 'Fournisseurs imposés': d.fournisseurs_imposes || '—',
      'Source': d.source || '—', 'Message': d.message || '—',
      'Ligne CRM (à coller dans un tableur)': colonnes.join('\t')
    };

    btnEnv.disabled = true;
    btnEnv.firstChild.textContent = 'Envoi en cours… ';

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(charge)
    })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || String(j.success) !== 'true') throw j; }); })
      .then(function () {
        form.hidden = true;
        merci.querySelector('.merci-prenom').textContent = d.prenom ? ', ' + d.prenom : '';
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
        btnEnv.disabled = false;
        btnEnv.firstChild.textContent = 'Envoyer ma demande ';
      });
  });

  afficher(1);
})();
