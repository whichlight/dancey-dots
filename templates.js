function prep_templates(){
    var templates = {};
    $('script[type="underscore/template"]').each(function(){
        var tmpl = null,
        id = $(this).attr("id");
        try {
            tmpl = _.template($(this).text());
        } catch(err){
            console.log('Error compiling template '+id, err);
            return;
        }
        templates[id] = function(){
            try{
                return tmpl.apply(this, arguments);
            } catch(err){
                console.log('Error executing template '+id, err);
            }
        }
    });
    return templates;
}

