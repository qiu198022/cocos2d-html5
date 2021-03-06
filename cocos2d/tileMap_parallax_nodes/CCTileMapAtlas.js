/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011      Zynga Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
var cc = cc = cc || {};

cc.TGA_OK = null;
cc.TGA_ERROR_FILE_OPEN = null;
cc.TGA_ERROR_READING_FILE = null;
cc.TGA_ERROR_INDEXED_COLOR = null;
cc.TGA_ERROR_MEMORY = null;
cc.TGA_ERROR_COMPRESSED_FILE = null;

function sImageTGA(status, type, pixelDepth, width, height, imageData, flipped) {
    this.status = status;
    this.type = type;
    this.pixelDepth = pixelDepth;
    /** map width */
    this.width = width;
    /** map height */
    this.height = height;
    /** raw data */
    this.imageData = imageData;
    this.flipped = flipped;
}
/** @brief cc.TileMapAtlas is a subclass of cc.AtlasNode.

 It knows how to render a map based of tiles.
 The tiles must be in a .PNG format while the map must be a .TGA file.

 For more information regarding the format, please see this post:
 http://www.cocos2d-iphone.org/archives/27

 All features from cc.AtlasNode are valid in cc.TileMapAtlas

 IMPORTANT:
 This class is deprecated. It is maintained for compatibility reasons only.
 You SHOULD not use this class.
 Instead, use the newer TMX file format: cc.TMXTiledMap
 */
cc.TileMapAtlas = cc.AtlasNode.extend({
    /** TileMap info */
    _m_pTGAInfo:null,
    m_pIndices:null,
    //! numbers of tiles to render
    _m_nItemsToRender:0,
    //! x,y to altas dicctionary
    _m_pPosToAtlasIndex:null,
    getTGAInfo:function () {
        return this._m_pTGAInfo;
    },
    setTGAInfo:function (Var) {
        this._m_pTGAInfo = Var;
    },
    /** initializes a cc.TileMap with a tile file (atlas) with a map file and the width and height of each tile in points.
     The file will be loaded using the TextureMgr.
     */
    initWithTileFile:function (tile, mapFile, tileWidth, tileHeight) {
        this._loadTGAfile(mapFile);
        this._calculateItemsToRender();
        if (cc.AtlasNode.initWithTileFile(tile, tileWidth, tileHeight, this._m_nItemsToRender)) {
            this._m_pPosToAtlasIndex = new Object();
            this._updateAtlasValues();
            this.setContentSize(cc.SizeMake((this._m_pTGAInfo.width * this._m_uItemWidth),
                (this._m_pTGAInfo.height * this._m_uItemHeight)));
            return true;
        }
        return false;
    },
    /** returns a tile from position x,y.
     For the moment only channel R is used
     */
    tileAt:function (position) {
        cc.Assert(this._m_pTGAInfo != null, "tgaInfo must not be nil");
        cc.Assert(position.x < this._m_pTGAInfo.width, "Invalid position.x");
        cc.Assert(position.y < this._m_pTGAInfo.height, "Invalid position.y");

        var ptr = this._m_pTGAInfo.imageData;
        var value = ptr[position.x + position.y * this._m_pTGAInfo.width];

        return value;
    },
    /** sets a tile at position x,y.
     For the moment only channel R is used
     */
    setTile:function (tile, position) {
        cc.Assert(this._m_pTGAInfo != null, "tgaInfo must not be nil");
        cc.Assert(this._m_pPosToAtlasIndex != null, "posToAtlasIndex must not be nil");
        cc.Assert(position.x < this._m_pTGAInfo.width, "Invalid position.x");
        cc.Assert(position.y < this._m_pTGAInfo.height, "Invalid position.x");
        cc.Assert(tile.r != 0, "R component must be non 0");

        var ptr = this._m_pTGAInfo.imageData;
        var value = ptr[position.x + position.y * this._m_pTGAInfo.width];
        if (value.r == 0) {
            cc.LOG("cocos2d: Value.r must be non 0.");
        } else {
            ptr[position.x + position.y * this._m_pTGAInfo.width] = tile;

            // XXX: this method consumes a lot of memory
            // XXX: a tree of something like that shall be impolemented
            var buffer;

            cc.LOG(buffer, position.x)
            var key = buffer;

            key += ",";
            cc.LOG(buffer, position.y)
            key += buffer;

            var num = this._m_pPosToAtlasIndex[key];
            this._updateAtlasValueAt(position, tile, num);
        }
    },
    /** dealloc the map from memory */
    releaseMap:function () {
        if (this._m_pTGAInfo) {
            cc.tgaDestroy(this._m_pTGAInfo);
        }
        this._m_pTGAInfo = null;

        if (this._m_pPosToAtlasIndex) {
            this._m_pPosToAtlasIndex.clear();
            delete this._m_pPosToAtlasIndex;
            this._m_pPosToAtlasIndex = null;
        }
    },
    /*private:*/
    _loadTGAfile:function (file) {
        cc.Assert(file != null, "file must be non-nil");

        //	//Find the path of the file
        //	NSBundle *mainBndl = [cc.Director sharedDirector].loadingBundle;
        //	cc.String *resourcePath = [mainBndl resourcePath];
        //	cc.String * path = [resourcePath stringByAppendingPathComponent:file];

        this._m_pTGAInfo = cc.tgaLoad(cc.FileUtils.fullPathFromRelativePath(file));
        if (this._m_pTGAInfo.status != cc.TGA_OK) {
            cc.Assert(0, "TileMapAtlasLoadTGA : TileMapAtas cannot load TGA file");
        }
    },
    _calculateItemsToRender:function () {
        cc.Assert(this._m_pTGAInfo != null, "tgaInfo must be non-nil");

        this._m_nItemsToRender = 0;
        for (var x = 0; x < this._m_pTGAInfo.width; x++) {
            for (var y = 0; y < this._m_pTGAInfo.height; y++) {
                var ptr = this._m_pTGAInfo.imageData;
                var value = ptr[x + y * this._m_pTGAInfo.width];
                if (value.r) {
                    ++this._m_nItemsToRender;
                }
            }
        }
    },
    _updateAtlasValueAt:function (pos, value, index) {
        var quad = new cc.V3F_C4B_T2F_Quad();

        var x = pos.x;
        var y = pos.y;
        var row = (value.r % this._m_uItemsPerRow);
        var col = (value.r / this._m_uItemsPerRow);

        var textureWide = (this._m_pTextureAtlas.getTexture().getPixelsWide());
        var textureHigh = (this._m_pTextureAtlas.getTexture().getPixelsHigh());

        if (cc.FIX_ARTIFACTS_BY_STRECHING_TEXEL) {
            var left = (2 * row * this._m_uItemWidth + 1) / (2 * textureWide);
            var right = left + (this._m_uItemWidth * 2 - 2) / (2 * textureWide);
            var top = (2 * col * this._m_uItemHeight + 1) / (2 * textureHigh);
            var bottom = top + (this._m_uItemHeight * 2 - 2) / (2 * textureHigh);
        } else {
            var left = (row * this._m_uItemWidth) / textureWide;
            var right = left + this._m_uItemWidth / textureWide;
            var top = (col * this._m_uItemHeight) / textureHigh;
            var bottom = top + this._m_uItemHeight / textureHigh;
        }

        quad.tl.texCoords.u = left;
        quad.tl.texCoords.v = top;
        quad.tr.texCoords.u = right;
        quad.tr.texCoords.v = top;
        quad.bl.texCoords.u = left;
        quad.bl.texCoords.v = bottom;
        quad.br.texCoords.u = right;
        quad.br.texCoords.v = bottom;

        quad.bl.vertices.x = (x * this._m_uItemWidth);
        quad.bl.vertices.y = (y * this._m_uItemHeight);
        quad.bl.vertices.z = 0.0;
        quad.br.vertices.x = (x * this._m_uItemWidth + this._m_uItemWidth);
        quad.br.vertices.y = (y * this._m_uItemHeight);
        quad.br.vertices.z = 0.0;
        quad.tl.vertices.x = (x * this._m_uItemWidth);
        quad.tl.vertices.y = (y * this._m_uItemHeight + this._m_uItemHeight);
        quad.tl.vertices.z = 0.0;
        quad.tr.vertices.x = (x * this._m_uItemWidth + this._m_uItemWidth);
        quad.tr.vertices.y = (y * this._m_uItemHeight + this._m_uItemHeight);
        quad.tr.vertices.z = 0.0;

        this._m_pTextureAtlas.updateQuad(quad, index);
    },
    _updateAtlasValues:function () {
        cc.Assert(this._m_pTGAInfo != null, "tgaInfo must be non-nil");

        var total = 0;

        for (var x = 0; x < this._m_pTGAInfo.width; x++) {
            for (var y = 0; y < this._m_pTGAInfo.height; y++) {
                if (total < this._m_nItemsToRender) {
                    var ptr = this._m_pTGAInfo.imageData;
                    var value = ptr[x + y * this._m_pTGAInfo.width];

                    if (value.r != 0) {
                        this._updateAtlasValueAt(cc.ccg(x, y), value, total);

                        var buffer;

                        cc.LOG(buffer, x)
                        var key = buffer;

                        key += ",";
                        cc.LOG(buffer, y)
                        key += buffer;

                        this._m_pPosToAtlasIndex[key] = total;

                        total++;
                    }
                }
            }
        }
    }
});

/** creates a cc.TileMap with a tile file (atlas) with a map file and the width and height of each tile in points.
 The tile file will be loaded using the TextureMgr.
 */
cc.TileMapAtlas.tileMapAtlasWithTileFile = function (tile, mapFile, tileWidth, tileHeight) {
    var pRet = new cc.TileMapAtlas();
    if (pRet.initWithTileFile(tile, mapFile, tileWidth, tileHeight)) {
        return pRet;
    }
    return null;
};