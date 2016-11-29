var initOption = {
    api_uri: 'https://api.covermymeds.com/',
    api_id: 'd895441311099b4f52cb' || '1vd9o4427lyi0ccb2uem'
};

var modules = (function modules(doc) {
    'use strict';
    var mods = {};

    mods.http = function(opt) {
        return new Promise(function(resolve, reject){
            var jsonData = '';
            var xhr = new XMLHttpRequest();
            xhr.open(opt.method, opt.api_uri);

            if(opt.api_id) {
                var auth = 'Bearer ' + opt.api_id + '+' + (opt.token_id || 'x-no-pass');
                xhr.setRequestHeader('Authorization', auth);
            }

            if(opt.body) {
                xhr.setRequestHeader('Content-Type', 'application/json');
                jsonData = JSON.stringify(opt.body);
            }

            xhr.send(jsonData);

            xhr.onload = function(){
                if(xhr.readyState === xhr.DONE && (xhr.status === 200 || xhr.status === 201)) {
                    if(opt.html) {
                        resolve(this.responseText);
                    } else {
                        resolve(JSON.parse(this.responseText));
                    }
                } else {
                    reject('Error getting data.');
                }
            };

            xhr.onerror = function() {
                reject('Error getting data.');
            };
        });
    };

    mods.maker = function(type) {
        return doc.createElement(type);
    };

    mods.loop = function(obj, fn) {
        for(var i=0, max=obj.length; i<max; i++) {
            fn(obj[i], i);
        }
    };

    mods.mapper = function(obj, fn) {
        Object.keys(obj).map(function(key) {
            fn(key);
        });
    };

    mods.getPartials = function(resp) {
        var partialContainer = mods.maker('div');
        partialContainer.innerHTML = resp;
        document.body.appendChild(partialContainer);

        return partialContainer;
    };

    return mods;

})(document);

var epaModule = (function epaModule(doc) {
    'use strict';
    var pa = {};
    var cmmContainer, formSet;

    pa.req = function(opt, fn, doms) {
        modules.http(opt).then(function(resp) {
            if(doms) {
                cmmContainer = doms[0];
                formSet = doms[1];
            }
            fn(resp);
        }).catch(function(err) {
            console.log(err);
        });
    };

    pa.create = pa.req;

    pa.view = function view(token) {
        token[0] = 'A92FML';
        token[1] = 'frucrv7l9z5cojmteexk';
        var viewOption = {
            method: 'GET',
            api_uri: initOption.api_uri + 'request-pages/' + (token[0] || this.getAttribute('data-req-id')) + "?v=1&nocache=" + new Date().getTime(),
            api_id: initOption.api_id,
            token_id: token[1] || this.getAttribute('data-token-id')
        };

        //pa.req(viewOption, pa.createPaForm);
        pa.req(viewOption, function(resp){
            var q = resp.request_page.forms.pa_request.question_sets;

            //console.log(q);

            var paCreate = document.querySelector('.pa-create');
            var fieldSet = document.createElement('div');
            fieldSet.className = 'fieldset';
            fieldSet.innerHTML = q[0].questions[0].content_html;

            paCreate.innerHTML = "";
            paCreate.appendChild(fieldSet);

            for(var i=0, max=q[1].questions.length; i<max; i++) {
                var qObj = q[1].questions[i];
                var qContainer = document.createElement('div');
                qContainer.className = "question-container";

                var qLabel = document.createElement('label');
                qLabel.classList.add("q-label");
                qLabel.textContent = qObj.question_text;
                qLabel.for = qObj.question_id;
                qLabel.classList.add(qObj.flag.toLowerCase());

                qContainer.appendChild(qLabel);

                if(qObj.choices) {
                    for(var j=0, cmax=qObj.choices.length; j<cmax; j++) {
                        var cObj = qObj.choices[j];
                        var cLabel = document.createElement('label');
                        cLabel.className = "c-label";

                        var cDom = document.createElement('input');
                        cDom.className = "choices";
                        cDom.type = qObj.select_multiple ? "checkbox" : "radio";
                        cDom.value = cObj.choice_id;
                        cDom.name = qObj.question_id;

                        if(!j && !qObj.select_multiple) {
                            cDom.setAttribute('checked', 'checked');
                        }

                        cLabel.appendChild(cDom);
                        cLabel.innerHTML += cObj.choice_text;
                        qContainer.appendChild(cLabel);
                    }
                }

                if(!/choice/.test(qObj.question_type.toLowerCase())) {
                    var qDom = document.createElement('input');
                    var qType = {
                        "DATE": "text",
                        "FREE_TEXT": "text"
                    };

                    qDom.type = qType[qObj.question_type];
                    qDom.name = qObj.id;
                    qContainer.appendChild(qDom);
                }

                fieldSet.appendChild(qContainer);
            }

        });
    };

    pa.getForms = function getForm(val) {
        var formOption = {
            method: 'GET',
            api_uri: initOption.api_uri + "forms?v=1",
            api_id: initOption.api_id
        };

        formOption.api_uri += "&drug_id=" + formSet.querySelector('[name="drug_id"]').value;
        formOption.api_uri += "&state=" + formSet.querySelector('[name="state"]').value;
        formOption.api_uri += "&q=" + val;

        var container = formSet.querySelector('[name="form_search_text"]').parentNode.parentNode;

        pa.req(formOption, function(resp) {
            pa.makeSearchResultContainer(resp.forms, container);
        });
    };

    pa.getDrugs = function getDrugs(val) {
        var drugOption = {
            method: 'GET',
            api_uri: initOption.api_uri + "drugs?v=1",
            api_id: initOption.api_id
        };
        var container;

        drugOption.api_uri += "&q=" + val;

        if(formSet) {
            container = formSet.querySelector('[name="name"]').parentNode.parentNode;
        } else {
            container = doc.querySelector('.search-drug').parentNode.parentNode;
        }

        pa.req(drugOption, function(resp) {
            pa.makeSearchResultContainer(resp.drugs, container);
        });
    };

    pa.makeSearchResultContainer = function makeFormContainer(resp, dom) {
        var fc = dom.querySelector('.form-container');
        if(fc) dom.removeChild(fc);

        var formUl = modules.maker('ul');
        formUl.id = "formContainer";
        formUl.className = 'form-container';

        modules.loop(resp, function(o) {
            var formLi = modules.maker('li');

            if(o.thumbnail_url) {
                var formImg = modules.maker('img');
                formImg.src = o.thumbnail_url;
                formLi.appendChild(formImg);
            }

            formLi.innerHTML += o.description || o.full_name;

            if(o.full_name) {
                formLi.onclick = function() {
                    dom.querySelector('[name="full_name"]').value = o.full_name;
                    dom.querySelector('[name="drug_id"]').value = o.id;
                    dom.removeChild(formUl);
                }
            }

            formUl.appendChild(formLi);
        });

        dom.appendChild(formUl);
    };

    pa.createPatientButton = function createPatientButton(resp) {
        var button = modules.maker('button');
        button.setAttribute('data-req-id', resp.request.id);
        button.setAttribute('data-token-id', resp.request.tokens[0].id);
        button.textContent = resp.request.patient.first_name + " " + resp.request.patient.last_name;
        button.value = button.textContent;
        button.className = "button";
        button.onclick = pa.view;

        cmmContainer.appendChild(button);
    };

    pa.createPaForm = function createPaForm(resp) {
        var fields = formSet.querySelectorAll('.fieldset');
        modules.loop(fields, function(o) {
            var h2 = modules.maker('h2');
            h2.textContent = o.id;
            o.appendChild(h2);

            var info = modules.maker('div');
            info.className = "info";
            o.appendChild(info);

            pa.createPaFormFields(resp.request[o.id], info);
        });
    };

    pa.createPaFormFields = function createPaFormFields(obj, dom) {
        modules.mapper(obj, function(key) {

            if(obj[key] && typeof obj[key] === 'object') {
                var address = modules.maker('div');
                address.className = "address";
                dom.parentNode.appendChild(address);

                pa.createPaFormFields(obj[key], address);
                return;
            }

            pa.createPaInput(obj, key, dom);
        });
    };

    pa.createPaInput = function createPaDiv(obj, key, dom) {
        var div = modules.maker('div');
        var label = modules.maker('label');
        var input = modules.maker('input');

        input.name = key;
        input.value = obj[key];
        label.textContent = key.replace(/_/g, " ");

        if(key === 'form_search_text') {
            input.onkeyup = function() {
                if(this.value.length < 4) return;
                pa.getForms(this.value);
            };
        }

        if(key === 'name') {
            input.onkeyup = function() {
                if(this.value.length < 4) return;
                pa.getDrugs(this.value);
            };
        }

        label.appendChild(input);
        div.appendChild(label);
        dom.appendChild(div);
    };

    return pa;

})(document);

var initPartialOption = {
    method: "GET",
    api_uri: "partials/create.html",
    html: true
};

modules.http(initPartialOption).then(function(partial) {

    return modules.getPartials(partial);

}).then(function(cc) {

    cc.classList.add('show');

    var partialOption = {
        method: "GET",
        api_uri: "partials/cmm.html",
        html: true
    };

    return modules.http(partialOption);

}).then(function(partial) {

    return modules.getPartials(partial);

}).then(function(pc) {
    'use strict';

    var cc = document.querySelector('.pa-create');

    var drugSearchBtn = cc.querySelector('.search-drug');
    drugSearchBtn.onkeyup = function () {
        this.onkeyup = function () {
            if (this.value.length < 4) return;
            epaModule.getDrugs(this.value);
        };
    };

    var paCreateBtn = cc.querySelector('.create-epa');
    paCreateBtn.onclick = function () {
        var cmmc = pc.querySelector('.cmm-container');
        var fs = pc.querySelector('.formset');
        var createPaOption = {
            method: 'post',
            api_uri: initOption.api_uri + 'requests?v=1',
            api_id: initOption.api_id,
            body: {
                request: {
                    state: document.querySelector('[name="state"]').value,
                    patient: {
                        first_name: document.querySelector('[name="first_name"]').value,
                        last_name: document.querySelector('[name="last_name"]').value,
                        date_of_birth: document.querySelector('[name="date_of_birth"]').value,
                        address: {
                            street_1: document.querySelector('[name="street_1"]').value,
                            street_2: document.querySelector('[name="street_2"]').value,
                            city: document.querySelector('[name="city"]').value,
                            state: document.querySelector('[name="state"]').value.toUpperCase(),
                            zip: document.querySelector('[name="zip"]').value
                        }
                    },
                    prescription: {
                        drug_id: document.querySelector('[name="drug_id"]').value
                    }
                }
            }
        };

        //epaModule.create(createPaOption, epaModule.createPatientButton, [cc, fs]);

        epaModule.create(createPaOption, function (resp) {
            epaModule.view([resp.request.id, resp.request.tokens[0].id]);
        }, [cmmc, fs]);

        cc.parentNode.classList.remove('show');
        pc.classList.add('show');
    };

}).catch(function(error) {

    console.log(error);

});