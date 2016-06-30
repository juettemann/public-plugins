/*
 * Copyright [1999-2016] Wellcome Trust Sanger Institute and the EMBL-European Bioinformatics Institute
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

Ensembl.Panel.ThousandGenome = Ensembl.Panel.ToolsForm.extend({

  init: function() {
    var panel = this;
    
    this.base.apply(this, arguments);

    this.elLk.speciesDropdown = this.elLk.form.find('._sdd');
    this.elLk.collection      = this.elLk.form.find('select[name=collection_format]');
    this.elLk.region          = this.elLk.form.find('input[name=region]');
    this.elLk.sample_url      = this.elLk.form.find('input[name=custom_sample_url]');
    this.elLk.file_url        = this.elLk.form.find('input[name=custom_file_url]');
    this.readSampleFile       = this.params['read_sample_file'];
    this.fileRestURL          = this.params['genome_file_rest_url'];

    //this.resetSpecies(this.defaultSpecies);
    this.editExisting();
    
    panel.elLk.region.on('change', function () {
      var collection_value = panel.elLk.collection.val();      
      var r = panel.elLk.region.val().match(/^([^:]+):\s?([0-9\,]+)(-|_|\.\.)([0-9\,]+)$/);

      if (!r || r.length !== 5 || r[4] - r[2] < 0) {
//don't do anything here, error message is in validation

      } else { //only if it is a valid region then do the below      
        //The region size restriction is only available on some tool (allele frequency)
        if(panel.elLk.form.find('input[name=region_check]').length && ((parseFloat(r[4].replace(/,/gi,"")) - parseFloat(r[2].replace(/,/gi,""))) + 1) > parseInt(panel.elLk.form.find('input[name=region_check]').val())) {
          panel.showError('The region size is too big, maximum region size allowed is '+parseInt(panel.elLk.form.find('input[name=region_check]').val()), 'Large region size');
          $(panel.elLk.form).data('valid', false);
          return;
        } else {
          $(panel.elLk.form).data('valid', true);
        }

        //getting the file url from 1KG rest if user input region and data collection is either phase1 or phase3
        if(collection_value != 'custom') {
          panel.getFileURL(r[1],collection_value);
        }
        
        //show sample population file url based on data collection selection (we have a specific file for human chrY)
        if(panel.elLk.region.val().match(/y:/gi) && collection_value === 'phase3') {
          panel.updatePopulation("","_stt_phase3_male");
          panel.elLk.form.find('[class^="_sample_url_"]').hide();
          panel.elLk.form.find('span._sample_url_phase3_male').show();
        } else {
          panel.elLk.form.find('span._stt_phase3_male').hide();
          if(collection_value != 'custom') {
            panel.elLk.form.find('span._stt_'+collection_value).show();
            panel.elLk.form.find('span._sample_url_phase3_male').hide();
          }
        }
      }
    });   
    
    panel.elLk.collection.on('change', function () {
      var r = panel.elLk.region.val().match(/^([^:]+):\s?([0-9\,]+)(-|_|\.\.)([0-9\,]+)$/);      
      if(panel.elLk.collection.val() != 'custom') {
        panel.elLk.form.find('div.custom_population').hide();
      }
     
      if(panel.elLk.collection.val() === 'custom' && panel.elLk.sample_url.val()) {
        panel.elLk.form.find('div.custom_population').show();
      }
      
      if(panel.elLk.collection.val() != 'custom' && panel.elLk.region.val()) {
        panel.getFileURL(r[1],panel.elLk.collection.val());        
      }
      
//      if(panel.elLk.speciesDropdown.find('input[name=species]:checked').val() === "Homo_sapiens") { //commenting this out for now as we only have human as species
      if(panel.elLk.collection.val() === 'phase3' && panel.elLk.region.val().match(/y:/gi)) {
        panel.updatePopulation("","_stt_phase3_male");
        panel.elLk.form.find('[class^="_sample_url_"]').hide();
        panel.elLk.form.find('span._sample_url_phase3_male').show();
      } else {
        panel.elLk.form.find('div._stt_phase3_male').hide();
        panel.elLk.form.find('span._sample_url_phase3_male').hide();
      }
//      }      
    });
    
    panel.elLk.sample_url.on('change', function () {
      var el = $(this);
      //validating for empty value before updating population url
      if (!panel.elLk.sample_url.val()) {
        panel.showError('Please provide a sample population URL', 'No sample population URL');
        $(panel.elLk.form).data('valid', false);
        return;
      }

      el.parents('form').validate(); //trigger the generic validate here because of the delay in 00_jquery_validate.js which was causing other event to happen before validation
    
      if(!el.data('valid')) {
        panel.elLk.form.find('div.custom_population select').html(''); //precautionary measure in case a user entered a valid sample url first and then reenter a not valid one
        panel.elLk.form.find('div.population').hide();
      } else {        
        panel.updatePopulation(panel.elLk.sample_url.val().replace(/^\s+|\s+$/g, ''),"custom_populations");
      }
    });

    
    // Add validate event to the form which gets triggered before submitting it
    this.elLk.form.on('validate', function(e) {
      if (!panel.elLk.region.val()) {
        panel.showError('Please enter a region', 'No region entered');
        $(this).data('valid', false);
        return;
      } else {
        var r = panel.elLk.region.val().match(/^([^:]+):\s?([0-9\,]+)(-|_|\.\.)([0-9\,]+)$/);

        if (!r || r.length !== 5 || r[4] - r[2] < 0) {
          panel.showError('Please enter a valid region e.g: 1:1-50000', 'Invalid Region Lookup');
          $(panel.elLk.form).data('valid', false);
          return;
        }
        
        if(panel.elLk.form.find('input[name=region_check]').length) { //The region size restriction is only available on some tool (allele frequency)        
          if(((parseFloat(r[4].replace(/,/gi,"")) - parseFloat(r[2].replace(/,/gi,""))) + 1) > parseInt(panel.elLk.form.find('input[name=region_check]').val())) {
            panel.showError('The region size is too big, maximum region size allowed is '+parseInt(panel.elLk.form.find('input[name=region_check]').val()), 'Large region size');
            $(panel.elLk.form).data('valid', false);
            return;
          }
        }
      }
      
      if(panel.elLk.collection.val() === "custom") {
        if (!panel.elLk.file_url.val()) {
          panel.showError('Please provide a file URL', 'No file URL');
          $(this).data('valid', false);
          return;
        }
        
        if (!panel.elLk.sample_url.val()) {
          panel.showError('Please provide a sample population URL', 'No sample population URL');
          $(this).data('valid', false);
          return;
        }
      }
      
      if(!panel.elLk.form.find('select.tools_listbox:visible').val()){
          panel.showError('Please choose at least one population', 'No population');
          $(this).data('valid', false);
          return;       
      }
    });   
  },
  
  getFileURL: function(region, collection) {
    var panel = this;     
    var url;

    region = "chr"+region+"\\.";
    collection = "1000 Genomes phase "+collection.replace("phase","")+" release";

    $.ajax({
      'type'    : "POST",      
      'url'     : panel.fileRestURL,
      'data'    : JSON.stringify({'query':{'constant_score':{'filter':{'bool':{'must':[{'term':{'dataCollections':collection}},{'term':{'dataType':'variants'}}]}}}}, 'size': '-1', '_source': ['url']}), //need to remove the size once returning all is supported by the rest
      'beforeSend' : function() { panel.toggleSpinner(true); },
      'success' : function(data) {
        if(!data.hits || !data.hits.total) {
          panel.elLk.form.find('span._span_url').html('<label class="invalid" style="display: inline;">Genotype file URL: We were enable to retrieve the file, please try again later.(No file obtained)</label>');
          panel.elLk.form.find('input[name=generated_file_url]').val("");
        } else {
          $.each (data.hits.hits, function (index,el) {
            if(el._source.url && !el._source.url.match(/tbi$/gi) && el._source.url.match(new RegExp(region, 'i'))) {
              url = el._source.url;
            }
          });
          panel.elLk.form.find('span._span_url').html("Genotype file URL: "+url);
          panel.elLk.form.find('input[name=generated_file_url]').val(url);
        }
      },
      'complete' :  function () { panel.toggleSpinner(false); },
      'error'     : function () {
        panel.toggleSpinner(false);
        panel.elLk.form.find('span._span_url').html('<label class="invalid" style="display: inline;">Genotype file URL: We were enable to retrieve the file, please try again later.</label>');
        panel.elLk.form.find('input[name=generated_file_url]').val("");        
      }
    });
  },  
  
  populateForm: function(jobsData) {
    var panel = this;
    
    if (jobsData && jobsData.length) {
      this.base(jobsData);
      //this.resetSpecies(jobsData[0]['species']);
      var upload_type = jobsData[0].upload_type;
      
      if(jobsData[0].job_desc) {
        this.elLk.form.find('input[name=name]').val(jobsData[0].job_desc);
      }
      
      if (upload_type === 'custom') {
        this.elLk.form.find('select[name=collection_format] option').removeAttr("selected");
        this.elLk.form.find('select[name=collection_format]').find('option[value=custom]').prop('selected', true).end().selectToToggle('trigger');
        this.elLk.form.find('input[name=custom_file_url]').val(jobsData[0].file_url);
        this.elLk.form.find('input[name=custom_sample_url]').val(jobsData[0].sample_panel);
        this.updatePopulation(jobsData[0].sample_panel,"custom_population", jobsData[0].population); //show population listbox
      } else {
        var population = this.elLk.form.find('input[name=region]').val().match(/y:/gi) && upload_type === "phase3" ? "phase3_male" : upload_type;
        this.elLk.form.find('select[name=collection_format] option').removeAttr("selected");
        this.elLk.form.find('select[name=collection_format]').find('option[value=' + upload_type + ']').prop('selected', true).end().selectToToggle('trigger');
        this.elLk.form.find('span._span_url').html("Genotype file URL: " + jobsData[0].file_url);
        this.elLk.form.find('input[name=generated_file_url]').val(jobsData[0].file_url);
        this.elLk.form.find('[class^="_sample_url_"]').hide(); //just a sanity check to hide everything first so that nothing is shown by mistake
        this.elLk.form.find('span._sample_url_'+population).show();
        this.updatePopulation("","_stt_"+population,jobsData[0].population);        
      }
      
      // Base format radio buttons are not available on all tool (only vcf to ped)
      if(panel.elLk.form.find('input[name=base]').length && jobsData[0].base){
        panel.elLk.form.find('input[name=base][value=' + jobsData[0].base + ']').prop('checked',true);
      }
    }
  },
  
  reset: function() {
    this.base.apply(this, arguments);
    
    this.elLk.form.find('div.population').hide();
    this.elLk.form.find('select[name=collection_format]').find('option[value=phase3]').prop('selected', true).end().selectToToggle('trigger');
    this.elLk.form.find('select[name=phase3_populations]').find('option[value=ALL]').prop('selected', true);
    this.elLk.form.find('span._span_url').html('Genotype file URL: ').show();
    this.elLk.form.find('input[name=generated_file_url]').val("");
  },
  
  updatePopulation: function(panel_url, panel_name, selected_value) {
  //create population listbox from panel file url or show hidden population listbox
    var panel = this;
    
    if(!panel_url) {
      this.elLk.form.find('div.population').hide();
      this.elLk.form.find('div.'+panel_name).show();
      if(selected_value) {
        var population_listbox = panel_name.replace("_stt_","") + "_populations";        
        this.elLk.form.find('select[name=' + population_listbox + '] option').removeAttr("selected");
        $.each(selected_value.split(","), function(i,e){
          panel.elLk.form.find('select[name=' + population_listbox + ']').find('option[value=' + e + ']').prop('selected', true);
        });
      }
    } else {
      panel.ajax({
        'comet'   : true,
        'type'    : 'POST',
        'url'     : panel.readSampleFile,
        'data'    : { population_url: panel_url },
        'spinner' : true,
        'success' : function(json) {
          var listbox  ="";
          
          if(json.error) {
            panel.showError('The sample population url is either invalid or not reachable', 'Invalid sample population URL');
            panel.elLk.form.find('div.custom_population select').html(''); //Hiding population dropdown if its already there before by inputing a valid sample url
            panel.elLk.form.find('div.population').hide();
            $(panel.elLk.form).data('valid', false);
            panel.ajax.spinner = 'false';            
          } else {
            $.each (json.populations, function (index,el) {
              if(el.value) {
                if(el.value.match(/sample/gi)) { next; } //skip if  there is a header          
                listbox += '<option value="' + el.value + '">' + el.caption + '</option>';
              }
            });
            panel.elLk.form.find('div.custom_population').show();
            panel.elLk.form.find('div.custom_population select').html('').append(listbox);
            if(selected_value) {
              $.each(selected_value.split(","), function(i,e){
                panel.elLk.form.find('div.custom_population select').find('option[value=' + e + ']').prop('selected', true);
              });
            }
          }          
        }
      });
    }
  }
});
