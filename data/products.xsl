<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="html" encoding="UTF-8" indent="yes"/>

    <xsl:template match="/">
        <html>
        <head>
            <title>LEGO Беларусь - Каталог товаров</title>
            <link rel="stylesheet" href="../styles/main.css"/>
        </head>
        <body>
            <header>
                <h1>LEGO Беларусь</h1>
                <p>г. Минск</p>
            </header>
            <main>
                <h2>Каталог товаров</h2>
                <xsl:apply-templates select="store/products/product"/>
            </main>
        </body>
        </html>
    </xsl:template>

    <xsl:template match="product">
        <div class="product-card">
            <h3><xsl:value-of select="name"/></h3>
            <p class="price">Цена: <xsl:value-of select="price"/> BYN</p>
            <p><xsl:value-of select="description"/></p>
            <p>Возраст: <xsl:value-of select="age"/></p>
        </div>
    </xsl:template>
</xsl:stylesheet>
