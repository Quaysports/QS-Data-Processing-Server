declare namespace sbt {

    type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>

    interface Item {
        test?: Boolean;
        _id?: string
        EAN: string
        isComposite: boolean
        isListingVariation: boolean
        linnId: string
        SKU: string
        title: string
        webTitle: string
        weight: number
        supplier:string
        suppliers:string[]
        brand:string
        description: string
        shortDescription: string
        lastUpdate: string
        marginNote:string
        legacyShipping:{
            //used to be SHIPCOURIERSTD, remove?
            standard:string
            //used to be SHIPCOURIEREXP
            expedited: string
            //used to be SHIPEBAYSTD, remove?
            standardEbay:string
            //used to be SHIPAMAZONEXP, remove?
            expeditedAmazon: string
        }
        prices:{
            //used to be PURCHASEPRICE
            purchase:number
            //used to be RETAILPRICE
            retail:number
            //used to be AMZPRICEINCVAT
            amazon:number
            //used to be EBAYPRICEINCVAT
            ebay:number
            //used to be QSPRICEINCVAT
            magento:number
            //used to be SHOPPRICEINCVAT
            shop:number
        }
        discounts:{
            shop:number
            magento:number
        }
        shelfLocation:{
            prefix:string
            letter:string
            number:string
        }
        // used to be CP, is it dynamically generated?
        channelPrices: {
            amazon: ChannelPriceData,
            ebay: ChannelPriceData,
            magento: ChannelPriceData,
            shop: {
                status: number,
                price: number
            }
        }
        //still used?
        stock: {
            //renamed from yelland?
            default: number,
            warehouse: number
            //map from STOCKTOTAL
            total: number
            //map from MINSTOCK
            minimum: number
            //map from STOCKVAL
            value: number
            //map from INVCHECKDATE
            checkedDate: string
        }
        stockTake:StockTake
        onOrder:OnOrder[]
        //used to be MD
        marginData: {
            amazon:AmazonMarginData
            ebay:ChannelMarginData
            magento:ChannelMarginData
            shop:ChannelMarginData
            packaging: number
            postage: number
            totalProfitLastYear: number
        }
        //used to be CD is it dynamically generated and still used?
        channelData: ChannelData[]
        channelReferenceData: ChannelReferenceData[]
        //used to be CHECK
        checkboxStatus: {
            stockForecast: {
                list:boolean
                hide:boolean
            },
            done:{
                goodsReceived:boolean
                addedToInventory:boolean
                EAN:boolean
                photos:boolean
                marginsCalculated:boolean
                jariloTemplate:boolean
                ebayDraft:boolean
                inventoryLinked:boolean
                ebay:boolean
                amazon:boolean
                magento:boolean
                zenTackle:boolean
                amazonStore:boolean
            },
            ready:{
                ebay:boolean
                amazon:boolean
                magento:boolean
                zenTackle:boolean
                amazonStore:boolean
            },
            notApplicable:{
                ebay:boolean
                amazon:boolean
                magento:boolean
                zenTackle:boolean
                amazonStore:boolean
            }
            //map from AMZPRIME
            prime:boolean
            marginCalculator:{
                //map from MCOVERRIDES
                hide:boolean
                amazonOverride:boolean
                ebayOverride:boolean
                magentoOverride:boolean
            }
        }
        //used to be IDBEP
        mappedExtendedProperties: {
            amazonLatency: number
            COMISO2: string
            COMISO3: string
            tariffCode: string
            category1: string
            category2: string
            bulletPoint1: string
            bulletPoint2: string
            bulletPoint3: string
            bulletPoint4: string
            bulletPoint5: string
            searchTerm1: string
            searchTerm2: string
            searchTerm3: string
            searchTerm4: string
            searchTerm5: string
            amazonSport: string
            amazonDepartment: string
            tradePack: string
            specialPrice: string
            //used to be SHIPFORMAT, move to extended properties?
            shippingFormat: string
            //used to be TILLFILTER
            tillFilter:string
            color: string
            gender: string
            size: string
            age: string
        }
        compositeItems: CompositeItems[]
        extendedProperties: LinnExtendedProperty[]
        postage:{
            // used to be POSTID?
            id: string
            //used to be POSTALPRICEUK
            price:number
            //used to be POSTMODID
            modifier:string
        }
        packaging: {
            lock: boolean,
            items: string[]
            editable: boolean
            //used to be PACKGROUP
            group: string
        }
        images:{
            main: Image,
            image1: Image,
            image2: Image,
            image3: Image,
            image4: Image,
            image5: Image,
            image6: Image,
            image7: Image,
            image8: Image,
            image9: Image,
            image10: Image,
            image11: Image
        }
        stockHistory: number[][]
        linkedSKUS: string[]
        //move items from IDBFILTER into tags
        tags: string[]
        till:{
            color: string,
        }
        brandLabel:{
            image: string,
            path: string,
            brand: string
            title1: string,
            title2: string,
            location:string
        }
    }
    interface Image {
        id: string
        url: string
        filename: string;
        link: string;
    }
    interface ChannelData {
        year: number;
        source: string;
        quantity: number;
    }

    interface ChannelReferenceData{
        id: string;
        SKU: string;
        source: string;
    }
    interface ChannelPriceData {
        price: number;
        subSource: string;
        updated: string;
        id: string;
        status: number;
        updateRequired: boolean;
    }
    interface CompositeItems {
        title: string;
        SKU: string;
        quantity: number;
        purchasePrice: number;
        weight: number;
    }
    interface LinnExtendedProperty {
        epName: string;
        epType: string;
        epValue: string;
        pkRowId: string;
    }
    interface ChannelMarginData {
        fees: number;
        profit: number;
        profitLastYear: number;
        salesVAT: number;
    }
    interface AmazonMarginData extends ChannelMarginData {
        primeProfit: number
        primePostage: number
    }
    interface OnOrder {
        confirmed: boolean;
        due: string;
        id: string;
        quantity: number;
    }

    export interface StockTake {
        checked?: boolean;
        date?: string | null;
        quantity?: number;
    }
    // struct for node worker return

    interface WorkerData {
        id: string,
        reqId: string,
        msg: string,
        data: object,
        socket?: string,
        type?: string
    }

    interface WorkerReq {
        type: string,
        data: {
            socket?: string,
            skus?: string,
            save?: boolean,
            items?: Item[],
        },
        id: string
    }
}

declare namespace linn {

    interface Query<T> {
        IsError: boolean;
        ErrorMessage: string;
        TotalResults: number;
        Columns: { Type: string; Index: number; Name: string }[];
        Results: T[];
    }

    interface BulkGetImagesResult {
        "Images": [
            BulkGetImagesImage
        ]
    }

    export interface BulkGetImagesImage {
        "SKU": string,
        "IsMain": boolean,
        "pkRowId": string,
        "ChecksumValue": string,
        "RawChecksum": string,
        "SortOrder": number,
        "StockItemId": string,
        "FullSource": string,
        "FullSourceThumbnail": string
    }

    interface Transfer {
        PkTransferId: string;
        FromLocationId: string;
        ToLocationId: string;
        FromLocation: string;
        ToLocation: string;
        Status: number;
        nStatus: number;
        ReferenceNumber: string;
        OrderDate: string;
        NumberOfItems: number;
        NumberOfNotes: number;
        fkOriginalTransferId: string;
        OriginalTransferReference: string;
        IsDiscrepancyTransfer: boolean;
        BLogicalDelete: boolean;
        Bins: { BinReference: string; BinBarcode: string; BinItems: { ItemNoteCount: number; SentQuantity: number; InToLocationQuantity: number; BinRackNumber: string; ItemNotes: { FkBinId: string; NoteUser: string; PkTransferItemId: string; Note: string; NoteDateTime: string; PkTransferItemNoteId: string; NoteRead: boolean }[]; ReceivedQuantity: number; PkTransferItemId: string; InFromLocationQuantity: number; Barcode: string; ItemTitle: string; PkBinId: string; SKU: string; DueFromLocationQuantity: number; RequestedQuantity: number; FkStockItemId: string }[]; BinName: string; BinNotes: { NoteUser: string; Note: string; PkTransferBinNoteId: string; NoteDateTime: string; PkBinId: string; NoteRead: boolean }[]; PkBinId: string }[];
        Notes: { NoteUser: string; Note: string; PkTransferNoteId: string; NoteDateTime: string; NoteRead: boolean }[];
        AuditTrail: { AuditNote: string; AuditDate: string; AuditType: number; nAuditType: number; PkTransferAuditId: string }[];
        TransferProperties: { TransferPropertyName: string; TransferPropertyValue: string; PkTransferPropertyId: string }[];
        UpdateStatus: { Status: boolean; Items: boolean; Properties: boolean; Information: boolean; Notes: boolean };
    }

    export interface AddToTransfer {
        PkTransferItemId: string;
        FkStockItemId: string;
        SKU: string;
        Barcode: string;
        ItemTitle: string;
        RequestedQuantity: number;
        SentQuantity: number;
        ReceivedQuantity: number;
        InFromLocationQuantity: number;
        DueFromLocationQuantity: number;
        InToLocationQuantity: number;
        ItemNoteCount: number;
        BinRackNumber: string;
        PkBinId: string;
        ItemNotes: {
            FkBinId: string;
            NoteUser: string;
            PkTransferItemId: string;
            Note: string;
            NoteDateTime: string;
            PkTransferItemNoteId: string;
            NoteRead: boolean
        }[];
    }

    interface ItemStock {
        Location: {
            LocationTag: string;
            StockLocationId: string;
            BinRack: string;
            IsWarehouseManaged: boolean;
            StockLocationIntId: number;
            LocationName: string;
            IsFulfillmentCenter: boolean
        };
        StockLevel: number;
        StockValue: number;
        MinimumLevel: number;
        InOrderBook: number;
        Due: number;
        JIT: boolean;
        InOrders: number;
        Available: number;
        UnitCost: number;
        SKU: string;
        AutoAdjust: boolean;
        LastUpdateDate: string;
        LastUpdateOperation: string;
        rowid: string;
        PendingUpdate: boolean;
        StockItemPurchasePrice: number;
        StockItemId: string;
        StockItemIntId: number;
    }

    interface PostalService {
        id: string;
        hasMappedShippingService: boolean;
        Channels: { PostalServiceName: string; SubSource: string; pkPostalServiceId: string; Source: string }[];
        ShippingServices: { accountid: string; vendorFriendlyName: string; PostalServiceName: string; vendor: string; pkPostalServiceId: string }[];
        PostalServiceName: string;
        PostalServiceTag: string;
        ServiceCountry: string;
        PostalServiceCode: string;
        Vendor: string;
        PrintModule: string;
        PrintModuleTitle: string;
        pkPostalServiceId: string;
        TrackingNumberRequired: boolean;
        WeightRequired: boolean;
        IgnorePackagingGroup: boolean;
        fkShippingAPIConfigId: number;
        IntegratedServiceId: string;
    }

}