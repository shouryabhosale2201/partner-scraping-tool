const expertiseListApi = async () => {
    const expertiseHierarchy = [];
    try {
        const url = 'https://partner-finder.oracle.com/catalog/api/file/OPN-EXPERTISELIST-DF';
        const response = await fetch(url);
        const expertiseData = await response.json();

        if (expertiseData.expertiseList && Array.isArray(expertiseData.expertiseList)) {
            expertiseData.expertiseList.forEach(level1 => {
                const level1Item = {
                    name: level1.name,
                    level_2_list: []
                };
        
                if (level1.level_2_list && Array.isArray(level1.level_2_list)) {
                    level1.level_2_list.forEach(level2 => {
                        const level2Item = {
                            name: level2.name,
                            level_3_list: []
                        };
        
                        if (level2.level_3_list && Array.isArray(level2.level_3_list)) {
                            level2.level_3_list.forEach(level3 => {
                                const level3Item = {
                                    name: level3.name,
                                    ucm_column: level3.ucm_column,
                                    level_4_list: []
                                };
        
                                if (level3.level_4_list && Array.isArray(level3.level_4_list)) {
                                    level3.level_4_list.forEach(level4 => {
                                        const level4Item = {
                                            id: level4.id,
                                            name: level4.name
                                        };
                                        level3Item.level_4_list.push(level4Item);
                                    });
                                }
        
                                level2Item.level_3_list.push(level3Item);
                            });
                        }
        
                        level1Item.level_2_list.push(level2Item);
                    });
                }
        
                expertiseHierarchy.push(level1Item);
            });
        }
        

        console.log('Filters and their heirarchy:', expertiseHierarchy);
    } catch (error) {
        console.error('Error fetching expertise list:', error.message);
    }
    return expertiseHierarchy;
}
module.exports = expertiseListApi;