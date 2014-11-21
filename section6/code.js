
(function () {

    var width = 960,
        height = 600;

    var geo_projection = d3.geo.albersUsa()
            .scale(1280)
            .translate([width / 2, height / 2]),
        geo_path = d3.geo.path()
            .projection(geo_projection);

    var svg = d3.select("#graph").append("svg")
            .attr("width", width)
            .attr("height", height);

    queue()
        .defer(d3.json, "data/us.json")
        .defer(d3.json, "data/states-hash.json")
        .defer(d3.csv, "data/state-populations.csv")
        .defer(d3.json, "data/city-populations.json")
        .defer(d3.xml, "data/military-bases.kml")
        .defer(d3.csv, "data/full-data-geodata.csv")
        .await(function (err, US, states_hash, populations, city_populations, military_bases, _ufos) {
            _ufos = prepare.filter_ufos(_ufos);
            var ufos = prepare.ufos(_ufos);
            populations = prepare.populations(populations);
            var states = prepare.states(states_hash);
            
            
            var tmp = clustered_ufos(_ufos, geo_projection),
                clustered = tmp[0], // cluster -> ufos
                clusters = tmp[1], // centroids, assignments

                cluster_populations = prepare.cluster_populations(clustered, city_populations);

            var drawers = Drawers(svg, ufos, populations, geo_path, geo_projection);

            drawers.map(US, geo_path, states);
            drawers.bases(military_bases, geo_projection);
            
            drawers.centroids(clusters.centroids, clustered, cluster_populations);

            var ufos_by_season = prepare.ufos_by_season(_ufos, clusters.assignments),
                seasons = seasons = d3.scale.ordinal()
                    .domain(d3.range(4))
                    .range(["winter", "spring", "summer", "autumn"]);

            var keyframes = prepare.precalc_animation(
                ufos_by_season,
                geo_projection,
                {centroids: clusters.centroids,
                 clustered: clustered,
                 populations: cluster_populations}
            ).keyframes;

            console.log(keyframes);

            var make_step = (function () {
                var step = 0,
                    year = 1945,
                    end_year = 2014;

                return function (direction) {
                    direction || (direction = 1);
                    if (step+direction <= 0) return;
                    if (step >= keyframes.length) return;

                    timeline_step(step);

                    if (direction > 0) {
                        update_caption(step, year);

                        step += direction;
                        
                        if (step%4 == 0) {
                            year += direction;
                        }
                    }else{
                        step += direction;
                        
                        if (step%4 == 0) {
                            year += direction;
                        }

                        update_caption(step, year);
                    }
                };
            })();
            //stepper = setInterval(make_step, 1000);

            make_step();

            var drag = d3.behavior.drag()
                    .origin(function () { return {x: 0, y: 0}; })
                    .on("drag", timeline_explore);

            d3.select("h1.season")
                .call(drag);

            d3.select("#down")
                .on("click", function () { make_step(-1); });
            d3.select("#up")
                .on("click", function () { make_step(+1); });

            function update_caption(step, year) {
                var season = seasons(step%12);

                d3.select("h1.season")
                    .html([season, year].join(" "));
            }

            function timeline_step (step) {
                //requestAnimationFrame(function () {
                    drawers.draw_keyframe(keyframes[step]);
                //});
            };

            function timeline_explore() {
                if (typeof stepper !== "undefined") {
                    clearInterval(stepper);
                }

                if (d3.event.x < 0) {
                    // back in time
                    make_step(-1);
                }else{
                    // forward in time
                    make_step(+1);
                }
            }
        });

})();
