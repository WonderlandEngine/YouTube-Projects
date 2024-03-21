import { Component, MeshComponent, Property, TextComponent, Texture, TextureManager } from '@wonderlandengine/api';

/**
 * sketchfab-search
 */
export class SketchfabSearch extends Component {
    static TypeName = 'sketchfab-search';

    /* Properties that are configurable in the editor */
    static Properties = {
        columnCount: Property.int(3),
        searchText: Property.string('tree'),
        textMaterial: Property.material(),
        planeMesh: Property.mesh(),
        planeMaterial: Property.material()
    };

    start() {
        console.log('Starting search with parameter ', this.searchText);

        fetch('https://api.sketchfab.com/v3/search?type=models&q=' + this.searchText)
            .then(response => response.json())
            .then(r => {
                let i = 0;
                for (const model of r.results) {
                    const name = model.name;
                    
                    let row = Math.floor(i / this.columnCount);
                    let col = i % this.columnCount;
                    let y = -0.6 * row;
                    let x = 0.6 * col;
                    
                    const c = this.engine.scene.addObject(this.object);
                    c.translateLocal([x, y, 0]);
                    c.setScalingLocal([0.5, 0.5, 0.5]);
                    c.addComponent(TextComponent, {
                        text: name,
                        material: this.textMaterial
                    })

                    const plane = this.engine.scene.addObject(c);

                    // Clone the material so we do not change the original
                    const mat = this.planeMaterial.clone();
                    const thumbnails = model.thumbnails.images;
                    const index = thumbnails.findIndex(t => t.width <= 256);
                    this.engine.textures.load(thumbnails[index].url, "no-cors")
                        .then(texture => {
                            mat.flatTexture = texture;
                        });

                    plane.setScalingLocal([0.5, 0.5, 0.5]);
                    plane.translateLocal([0.5, -0.5, 0]);
                    plane.addComponent(MeshComponent, {
                        mesh: this.planeMesh,
                        material: mat
                    });

                    i++;
                }
            })
    }

}
